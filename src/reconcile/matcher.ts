import { decideMatches, type MatchDecision, type MatchRequest } from '../ai/match-prompt.js';
import { config } from '../core/config.js';
import { MatchingError } from '../core/errors.js';
import { log } from '../core/logger.js';
import { sqlConnection } from '../db/client.js';
import type { Flag } from '../extract/normalize.js';
import { findCandidatesForOffer, bruteForceComparisons, type Candidate } from './candidates.js';
import { resolveConflicts, type ConflictCandidate } from './conflicts.js';
import {
  AMBIGUOUS_THRESHOLD,
  needsReview,
  resolveStatus,
  type DecidedBy,
  type ReconciliationStatus,
} from './status.js';

/**
 * Conciliacion en cascada, de lo barato a lo caro.
 *
 *   Nivel 0  Alias confirmado por un comprador  -> gratis, confianza 1.0
 *   Nivel 1  Prefiltro vectorial en Postgres    -> 1 query, top-5 por linea
 *   Nivel 2  Decision (LLM o lexica)            -> sobre 5 candidatos, no 220
 *   Nivel 3  Resolucion de conflictos           -> ningun duplicado silencioso
 *   Nivel 4  Barrido de faltantes               -> lo pedido y no cotizado
 *
 * El orden no es arbitrario: cada nivel resuelve lo que puede y le pasa al
 * siguiente solo lo que quedo sin decidir. En una segunda cotizacion del mismo
 * proveedor, el nivel 0 se lleva la mayoria de las lineas y el LLM casi no se
 * usa: el sistema se abarata con el uso.
 */

export const STRATEGY_VERSION = 'cascade-v1';

export interface OfferLine {
  readonly id: string;
  readonly lineNo: number;
  readonly supplierCode: string | null;
  readonly description: string;
  readonly quantity: number;
  readonly unitOfMeasure: string | null;
  readonly unitPrice: number | null;
  readonly flags: readonly Flag[];
}

export interface RequisitionLine {
  readonly id: string;
  readonly lineNo: number;
  readonly description: string;
  readonly quantity: number;
  readonly unitOfMeasure: string | null;
}

export interface ReconciledLine {
  readonly requisitionItemId: string | null;
  readonly offerItemId: string | null;
  readonly offerLineNo: number | null;
  readonly requisitionLineNo: number | null;
  readonly status: ReconciliationStatus;
  readonly confidence: number;
  readonly quantityDelta: number | null;
  readonly priceTotal: number | null;
  readonly reasoning: string;
  readonly candidates: readonly { lineNo: number; description: string; score: number }[];
  readonly needsReview: boolean;
  readonly decidedBy: DecidedBy;
}

export interface ReconcileOutcome {
  readonly lines: readonly ReconciledLine[];
  readonly modelUsed: string | null;
  readonly metrics: {
    readonly offerLines: number;
    readonly requisitionItems: number;
    readonly bruteForceComparisons: number;
    readonly prefilterQueries: number;
    readonly prefilterMs: number;
    readonly resolvedByAlias: number;
    readonly resolvedByLlm: number;
    readonly resolvedByLexical: number;
    readonly conflicts: number;
    readonly llmCalls: number;
    readonly llmBatches: number;
    readonly inputTokens: number;
    readonly outputTokens: number;
  };
}

export interface ReconcileOptions {
  readonly offerId: string;
  readonly requisitionId: string;
  readonly providerId: string;
  readonly dryRun: boolean;
  readonly topK?: number;
}

export async function reconcileOffer({
  offerId,
  requisitionId,
  providerId,
  dryRun,
  topK = 5,
}: ReconcileOptions): Promise<ReconcileOutcome> {
  const sql = sqlConnection();

  const offerLines = await loadOfferLines(offerId);
  const requisitionLines = await loadRequisitionLines(requisitionId);

  if (offerLines.length === 0) {
    throw new MatchingError('la oferta no tiene lineas', { offerId });
  }
  if (requisitionLines.length === 0) {
    throw new MatchingError('la requisicion no tiene items con embedding', { requisitionId });
  }

  const requisitionByLineNo = new Map(requisitionLines.map((r) => [r.lineNo, r]));
  const requisitionById = new Map(requisitionLines.map((r) => [r.id, r]));

  /* --- Nivel 0: alias confirmados ---------------------------------------- */

  const aliases = await loadAliases(providerId, requisitionId);
  const decided = new Map<
    number,
    { requisitionItemId: string; confidence: number; reasoning: string; decidedBy: DecidedBy }
  >();

  for (const line of offerLines) {
    if (!line.supplierCode) continue;
    const aliasItemId = aliases.get(line.supplierCode);
    if (!aliasItemId) continue;

    decided.set(line.lineNo, {
      requisitionItemId: aliasItemId,
      confidence: 1,
      reasoning: `alias confirmado: el codigo ${line.supplierCode} de este proveedor ya fue asociado a este item por un comprador`,
      decidedBy: 'alias',
    });
  }

  const resolvedByAlias = decided.size;
  if (resolvedByAlias > 0) {
    log.info('resueltas por alias sin costo', { lineas: resolvedByAlias });
  }

  /* --- Nivel 1: prefiltro vectorial -------------------------------------- */

  const prefilterStarted = performance.now();
  const candidatesByLine = await findCandidatesForOffer(offerId, requisitionId, topK);
  const prefilterMs = performance.now() - prefilterStarted;

  log.info('prefiltro vectorial', {
    lineas: offerLines.length,
    queries: 1,
    ms: Math.round(prefilterMs),
    comparacionesEvitadas: bruteForceComparisons(offerLines.length, requisitionLines.length),
  });

  /* --- Nivel 2: decision -------------------------------------------------- */

  const pending = offerLines.filter((l) => !decided.has(l.lineNo));
  /** Por que una linea quedo sin item asignado. Alimenta el reasoning del extra. */
  const rejectionReasons = new Map<number, string>();
  let llmCalls = 0;
  let llmBatches = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let resolvedByLlm = 0;
  let resolvedByLexical = 0;
  let modelUsed: string | null = null;

  if (dryRun) {
    for (const line of pending) {
      const candidates = candidatesByLine.get(line.lineNo) ?? [];
      const outcome = decideLexically(line, candidates);

      if (outcome.kind === 'extra') {
        rejectionReasons.set(line.lineNo, outcome.reason);
        continue;
      }

      const { decision } = outcome;
      const target =
        decision.matchedRequisitionLineNo === null
          ? undefined
          : requisitionByLineNo.get(decision.matchedRequisitionLineNo);
      if (!target) continue;

      decided.set(line.lineNo, {
        requisitionItemId: target.id,
        confidence: decision.confidence,
        reasoning: decision.reasoning,
        decidedBy: 'lexical',
      });
      resolvedByLexical++;
    }
  } else {
    const requests: MatchRequest[] = pending.map((line) => ({
      offerLineNo: line.lineNo,
      supplierCode: line.supplierCode,
      description: line.description,
      quantity: line.quantity,
      unit: line.unitOfMeasure,
      candidates: candidatesByLine.get(line.lineNo) ?? [],
    }));

    const outcome = await decideMatches(requests);
    llmCalls = outcome.calls;
    llmBatches = outcome.batches;
    inputTokens = outcome.inputTokens;
    outputTokens = outcome.outputTokens;
    modelUsed = config().llmModel;

    for (const [lineNo, decision] of outcome.decisions) {
      if (decision.matchedRequisitionLineNo === null) continue;
      const target = requisitionByLineNo.get(decision.matchedRequisitionLineNo);
      if (!target) {
        log.warn('el LLM devolvio un item que no existe en la requisicion', {
          linea: lineNo,
          itemDevuelto: decision.matchedRequisitionLineNo,
        });
        continue;
      }

      decided.set(lineNo, {
        requisitionItemId: target.id,
        confidence: decision.confidence,
        reasoning: decision.reasoning,
        decidedBy: 'vector+llm',
      });
      resolvedByLlm++;
    }
  }

  /* --- Nivel 3: conflictos ------------------------------------------------ */

  const conflictInput: ConflictCandidate[] = [];
  for (const line of offerLines) {
    const decision = decided.get(line.lineNo);
    if (!decision) continue;
    conflictInput.push({
      offerLineNo: line.lineNo,
      requisitionItemId: decision.requisitionItemId,
      confidence: decision.confidence,
      isAlternative: line.flags.includes('alternative_line'),
    });
  }

  const conflicts = resolveConflicts(conflictInput);
  const conflictByLine = new Map(conflicts.resolutions.map((r) => [r.offerLineNo, r]));

  if (conflicts.conflictCount > 0) {
    log.info('conflictos resueltos', {
      items: conflicts.conflictCount,
      lineasAfectadas: conflicts.resolutions.length,
    });
  }

  /* --- Armado de las lineas del resultado --------------------------------- */

  const lines: ReconciledLine[] = [];
  const claimedItems = new Set<string>();

  for (const line of offerLines) {
    const candidates = (candidatesByLine.get(line.lineNo) ?? []).map((c) => ({
      lineNo: c.lineNo,
      description: c.description,
      score: Number(c.score.toFixed(4)),
    }));

    const decision = decided.get(line.lineNo);
    const conflict = conflictByLine.get(line.lineNo);
    const priceTotal = line.unitPrice === null ? null : line.unitPrice * line.quantity;

    // Sin decision: es un extra, el proveedor cotizo algo que no se pidio.
    if (!decision) {
      lines.push({
        requisitionItemId: null,
        offerItemId: line.id,
        offerLineNo: line.lineNo,
        requisitionLineNo: null,
        status: 'extra',
        confidence: candidates[0] ? Math.max(0, 1 - candidates[0].score) : 0.5,
        quantityDelta: null,
        priceTotal,
        reasoning:
          rejectionReasons.get(line.lineNo) ??
          'el LLM determino que ninguno de los candidatos corresponde a esta linea',
        candidates,
        needsReview: false,
        decidedBy: 'unmatched',
      });
      continue;
    }

    const target = requisitionById.get(decision.requisitionItemId);
    if (!target) continue;

    // Perdio un conflicto: queda como `alternative` (competidora creible para
    // el mismo item) o como `ambiguous` (no se puede determinar a que
    // corresponde). En los dos casos conserva el vinculo, pero NO reclama el
    // item: solo una linea puede cubrirlo con confianza.
    if (conflict && conflict.status !== null) {
      lines.push({
        requisitionItemId: target.id,
        offerItemId: line.id,
        offerLineNo: line.lineNo,
        requisitionLineNo: target.lineNo,
        status: conflict.status,
        confidence: decision.confidence,
        quantityDelta: line.quantity - target.quantity,
        priceTotal,
        reasoning: conflict.note,
        candidates,
        needsReview: true,
        decidedBy: decision.decidedBy,
      });
      continue;
    }

    const outcome = resolveStatus({
      requestedQuantity: target.quantity,
      offeredQuantity: line.quantity,
      flags: line.flags,
      confidence: decision.confidence,
    });

    // El item queda reclamado incluso si la linea es ambigua: si no, el mismo
    // item apareceria ademas como `missing_from_offer`, y el comprador leeria
    // "no cotizado" justo al lado de una linea que propone cotizarlo. La
    // cobertura del resumen igual excluye las ambiguas: quedan en su propio
    // grupo, ni cubiertas ni faltantes.
    claimedItems.add(target.id);

    lines.push({
      requisitionItemId: target.id,
      offerItemId: line.id,
      offerLineNo: line.lineNo,
      requisitionLineNo: target.lineNo,
      status: outcome.status,
      confidence: decision.confidence,
      quantityDelta: outcome.quantityDelta,
      priceTotal,
      reasoning: conflict
        ? `${decision.reasoning}. ${conflict.note}`
        : `${decision.reasoning}. ${outcome.reasoning}`,
      candidates,
      needsReview: needsReview(outcome.status, decision.confidence) || conflict !== undefined,
      decidedBy: decision.decidedBy,
    });
  }

  /* --- Nivel 4: barrido de faltantes -------------------------------------- */

  for (const requisitionLine of requisitionLines) {
    if (claimedItems.has(requisitionLine.id)) continue;

    lines.push({
      requisitionItemId: requisitionLine.id,
      offerItemId: null,
      offerLineNo: null,
      requisitionLineNo: requisitionLine.lineNo,
      status: 'missing_from_offer',
      confidence: 1,
      quantityDelta: null,
      priceTotal: null,
      reasoning: 'ninguna linea de la oferta corresponde a este item solicitado',
      candidates: [],
      needsReview: true,
      decidedBy: 'unmatched',
    });
  }

  void sql; // el pool se cierra desde el CLI

  return {
    lines,
    modelUsed,
    metrics: {
      offerLines: offerLines.length,
      requisitionItems: requisitionLines.length,
      bruteForceComparisons: bruteForceComparisons(offerLines.length, requisitionLines.length),
      prefilterQueries: 1,
      prefilterMs,
      resolvedByAlias,
      resolvedByLlm,
      resolvedByLexical,
      conflicts: conflicts.conflictCount,
      llmCalls,
      llmBatches,
      inputTokens,
      outputTokens,
    },
  };
}

/**
 * Decision lexica para --dry-run: se queda con el mejor candidato si supera el
 * umbral.
 *
 * Es honestamente peor que el LLM y no pretende otra cosa: no entiende que
 * "Llave termomagnetica" e "Interruptor automatico" son lo mismo. Su valor es
 * que permite correr el pipeline entero sin API key y tener una linea de base
 * contra la cual medir cuanto aporta el modelo.
 */
type LexicalOutcome =
  | { readonly kind: 'match'; readonly decision: MatchDecision }
  | { readonly kind: 'extra'; readonly reason: string };

/**
 * Sobre el umbral, medido en el case-complex:
 *
 *   top-1 correcto   n=151  min 0.353  mediana 0.748
 *   top-1 incorrecto n=13   min 0.301  mediana 0.505
 *   extras reales    n=5    0.271, 0.386, 0.411, 0.475, 0.485
 *
 * Las distribuciones se SOLAPAN: no existe un corte por score que separe un
 * extra de un match correcto. Insistir con un umbral seria fingir precision.
 *
 * Lo que si funciona es una senial que ya esta en los datos: el proveedor anota
 * esas lineas como "adicional no pedido" o "adicional sugerido", y eso llega
 * como flag `extra_suggested`. Se usa como evidencia, no como veredicto: solo
 * decide cuando la similitud vectorial no la contradice con fuerza.
 *
 * Limitacion conocida y documentada: una oferta real que no anote sus extras
 * no se beneficia de esto y los va a dejar en `ambiguous`. Es el caso donde el
 * LLM, que puede responder "ninguno de los 5 corresponde", gana de verdad.
 */
function decideLexically(line: OfferLine, candidates: readonly Candidate[]): LexicalOutcome {
  const best = candidates[0];
  if (!best) return { kind: 'extra', reason: 'no hay ningun item solicitado con el cual comparar' };

  const SUPPLIER_FLAGGED_CEILING = 0.6;
  if (line.flags.includes('extra_suggested') && best.score < SUPPLIER_FLAGGED_CEILING) {
    return {
      kind: 'extra',
      reason:
        `el proveedor la anota como producto adicional y la similitud con el mejor candidato ` +
        `es baja (${best.score.toFixed(3)} contra "${best.description}")`,
    };
  }

  // Piso general. Un solo umbral alto resultaba enganioso: lineas como
  // "Rollo PTFE" (0.353 contra "Cinta teflon") caian a `extra`, o sea el
  // sistema afirmaba que el comprador no habia pedido eso. Falso.
  const PROPOSE_FLOOR = 0.25;
  if (best.score < PROPOSE_FLOOR) {
    return {
      kind: 'extra',
      reason: `ningun item solicitado se le parece (mejor candidato: ${best.score.toFixed(3)})`,
    };
  }

  const second = candidates[1];
  // Si el segundo candidato esta muy cerca del primero, la eleccion es dudosa.
  // Se refleja bajando la confianza.
  const margin = second ? best.score - second.score : best.score;
  const confidence = Math.min(0.95, best.score + Math.min(margin, 0.15));

  return {
    kind: 'match',
    decision: {
      offerLineNo: line.lineNo,
      matchedRequisitionLineNo: best.lineNo,
      confidence: Number(confidence.toFixed(2)),
      reasoning:
        `similitud lexica ${best.score.toFixed(3)} contra "${best.description}"` +
        (second ? `, margen de ${margin.toFixed(3)} sobre el siguiente candidato` : '') +
        (confidence < AMBIGUOUS_THRESHOLD ? ' (por debajo del umbral de confianza)' : ''),
    },
  };
}

async function loadOfferLines(offerId: string): Promise<OfferLine[]> {
  const sql = sqlConnection();
  const rows = await sql<
    {
      id: string;
      line_no: number;
      supplier_code: string | null;
      offered_description: string;
      offered_quantity: string;
      unit_of_measure: string | null;
      unit_price: string | null;
      flags: string[];
    }[]
  >`
    SELECT id, line_no, supplier_code, offered_description, offered_quantity,
           unit_of_measure, unit_price, flags
    FROM offer_items
    WHERE offer_id = ${offerId}
    ORDER BY line_no
  `;

  return rows.map((r) => ({
    id: r.id,
    lineNo: r.line_no,
    supplierCode: r.supplier_code,
    description: r.offered_description,
    quantity: Number(r.offered_quantity),
    unitOfMeasure: r.unit_of_measure,
    unitPrice: r.unit_price === null ? null : Number(r.unit_price),
    flags: r.flags as Flag[],
  }));
}

async function loadRequisitionLines(requisitionId: string): Promise<RequisitionLine[]> {
  const sql = sqlConnection();
  const rows = await sql<
    {
      id: string;
      line_no: number;
      raw_description: string;
      quantity: string;
      unit_of_measure: string | null;
    }[]
  >`
    SELECT id, line_no, raw_description, quantity, unit_of_measure
    FROM requisition_items
    WHERE requisition_id = ${requisitionId}
    ORDER BY line_no
  `;

  return rows.map((r) => ({
    id: r.id,
    lineNo: r.line_no,
    description: r.raw_description,
    quantity: Number(r.quantity),
    unitOfMeasure: r.unit_of_measure,
  }));
}

/** Alias confirmados de este proveedor, limitados a items de esta requisicion. */
async function loadAliases(
  providerId: string,
  requisitionId: string,
): Promise<Map<string, string>> {
  const sql = sqlConnection();
  const rows = await sql<{ supplier_code: string; requisition_item_id: string }[]>`
    SELECT a.supplier_code, ri.id AS requisition_item_id
    FROM supplier_item_aliases a
    JOIN requisition_items ri ON ri.item_id = a.item_id
    WHERE a.provider_id = ${providerId}
      AND ri.requisition_id = ${requisitionId}
  `;

  return new Map(rows.map((r) => [r.supplier_code, r.requisition_item_id]));
}
