import { sqlConnection } from '../db/client.js';
import type { ReconcileOutcome } from './matcher.js';
import { STRATEGY_VERSION } from './matcher.js';
import { isShortfall, type ReconciliationStatus } from './status.js';

/**
 * Persistencia del resultado de una conciliacion y calculo del resumen.
 *
 * El resumen se guarda como jsonb junto a la corrida: es lo que consumen los
 * reportes sin tener que recalcular nada, y deja congelado el estado de esa
 * corrida aunque despues cambie la estrategia.
 */

export interface ReconciliationSummary {
  readonly offerLines: number;
  readonly requisitionItems: number;
  readonly covered: number;
  readonly coveragePct: number;
  /** Items con una linea propuesta pero sin confianza suficiente. */
  readonly ambiguousItems: number;
  readonly byStatus: Record<string, number>;
  readonly needsReview: number;
  /** Total de todas las lineas cotizadas. */
  readonly quotedTotal: number;
  /** Total solo de las lineas que corresponden a algo pedido. */
  readonly comparableTotal: number;
  readonly extrasTotal: number;
  readonly shortfallLines: number;
  readonly overageLines: number;
  readonly metrics: ReconcileOutcome['metrics'];
}

export function summarize(outcome: ReconcileOutcome): ReconciliationSummary {
  const byStatus: Record<string, number> = {};
  for (const line of outcome.lines) {
    byStatus[line.status] = (byStatus[line.status] ?? 0) + 1;
  }

  // Cobertura = items que estan cotizados CON CONFIANZA. Las lineas ambiguas y
  // las alternativas no cuentan: la primera porque el sistema no pudo afirmar a
  // que item corresponde, la segunda porque es una segunda opcion de un item
  // que ya cubre otra linea.
  const coveredItems = new Set(
    outcome.lines
      .filter(
        (l) =>
          l.requisitionItemId !== null &&
          l.offerItemId !== null &&
          (l.status === 'match' || l.status === 'partial_quantity' || l.status === 'semantic_match'),
      )
      .map((l) => l.requisitionItemId!),
  );
  const covered = coveredItems.size;

  // Items cuya unica linea candidata quedo ambigua: ni cubiertos ni faltantes.
  const ambiguousItems = new Set(
    outcome.lines
      .filter((l) => l.status === 'ambiguous' && l.requisitionItemId !== null)
      .map((l) => l.requisitionItemId!),
  );
  for (const id of coveredItems) ambiguousItems.delete(id);

  const quotedTotal = outcome.lines.reduce((acc, l) => acc + (l.priceTotal ?? 0), 0);

  // Los extras no entran al comparativo: no se pidieron, asi que sumarlos
  // inflaria el total contra el que se compara a otro proveedor.
  const comparableTotal = outcome.lines
    .filter((l) => l.requisitionItemId !== null && l.status !== 'alternative')
    .reduce((acc, l) => acc + (l.priceTotal ?? 0), 0);

  const extrasTotal = outcome.lines
    .filter((l) => l.status === 'extra')
    .reduce((acc, l) => acc + (l.priceTotal ?? 0), 0);

  return {
    offerLines: outcome.metrics.offerLines,
    requisitionItems: outcome.metrics.requisitionItems,
    covered,
    coveragePct: Number(((covered / outcome.metrics.requisitionItems) * 100).toFixed(1)),
    ambiguousItems: ambiguousItems.size,
    byStatus,
    needsReview: outcome.lines.filter((l) => l.needsReview).length,
    quotedTotal: round2(quotedTotal),
    comparableTotal: round2(comparableTotal),
    extrasTotal: round2(extrasTotal),
    shortfallLines: outcome.lines.filter((l) => isShortfall(l.quantityDelta)).length,
    overageLines: outcome.lines.filter((l) => (l.quantityDelta ?? 0) > 0).length,
    metrics: outcome.metrics,
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function persistReconciliation(
  offerId: string,
  requisitionId: string,
  outcome: ReconcileOutcome,
): Promise<{ reconciliationId: string; summary: ReconciliationSummary }> {
  const sql = sqlConnection();
  const summary = summarize(outcome);

  // Sobre el jsonb: se manda SIEMPRE como texto con doble cast `::text::jsonb`.
  //
  // Verificado contra la base. Las otras formas fallan o corrompen:
  //   `${JSON.stringify(x)}::jsonb`  -> guarda un jsonb de tipo `string`, con el
  //                                     JSON escapado adentro. Al leerlo vuelve
  //                                     texto en vez de objeto.
  //   objeto crudo o `sql.json(x)`   -> funcionan en aislamiento pero rompen el
  //                                     Bind segun como quede tipado el
  //                                     parametro (postgres.js busca el
  //                                     serializer por OID y `json` esta
  //                                     registrado bajo 114, no bajo 3802).
  //
  // Con `::text` el parametro viaja como texto plano y es Postgres quien parsea
  // el JSON. Es la unica forma que no depende del tipado del driver.
  const [reconciliation] = await sql<{ id: string }[]>`
    INSERT INTO reconciliations (offer_id, requisition_id, strategy_version, model_used, summary)
    VALUES (${offerId}, ${requisitionId}, ${STRATEGY_VERSION}, ${outcome.modelUsed},
            ${JSON.stringify(summary)}::text::jsonb)
    RETURNING id
  `;

  if (!reconciliation) throw new Error('no se pudo crear la conciliacion');

  // Insercion por lotes con unnest: un statement por lote, con cada columna
  // tipada explicitamente. Evita el helper `sql(batch)`, que no deja poner el
  // cast que necesita la columna jsonb.
  const BATCH = 50;
  for (let start = 0; start < outcome.lines.length; start += BATCH) {
    const batch = outcome.lines.slice(start, start + BATCH);

    await sql`
      INSERT INTO reconciliation_lines (
        reconciliation_id, requisition_item_id, offer_item_id, status, confidence,
        quantity_delta, price_total, reasoning, candidates, needs_review, decided_by
      )
      SELECT
        ${reconciliation.id}::uuid,
        d.requisition_item_id::uuid,
        d.offer_item_id::uuid,
        d.status,
        d.confidence::numeric,
        d.quantity_delta::numeric,
        d.price_total::numeric,
        d.reasoning,
        d.candidates::jsonb,
        d.needs_review::boolean,
        d.decided_by
      FROM unnest(
        ${batch.map((l) => l.requisitionItemId)}::text[],
        ${batch.map((l) => l.offerItemId)}::text[],
        ${batch.map((l) => l.status satisfies ReconciliationStatus)}::text[],
        ${batch.map((l) => l.confidence.toFixed(2))}::text[],
        ${batch.map((l) => (l.quantityDelta === null ? null : String(l.quantityDelta)))}::text[],
        ${batch.map((l) => (l.priceTotal === null ? null : String(l.priceTotal)))}::text[],
        ${batch.map((l) => l.reasoning)}::text[],
        ${batch.map((l) => JSON.stringify(l.candidates))}::text[],
        ${batch.map((l) => String(l.needsReview))}::text[],
        ${batch.map((l) => l.decidedBy)}::text[]
      ) AS d(
        requisition_item_id, offer_item_id, status, confidence, quantity_delta,
        price_total, reasoning, candidates, needs_review, decided_by
      )
    `;
  }

  await sql`UPDATE offers SET status = 'reconciled' WHERE id = ${offerId}`;

  return { reconciliationId: reconciliation.id, summary };
}
