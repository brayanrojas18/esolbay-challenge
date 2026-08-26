import type { ReconciliationStatus } from './status.js';

/**
 * Nivel 3 de la cascada: dos lineas ofertadas que apuntan al mismo item.
 *
 * Gana la de mayor confianza. La perdedora nunca se descarta en silencio:
 * queda como alternativa si compitio de cerca, o como dudosa. Ver
 * docs/DECISIONS.md para el porque.
 */

/** Hasta esta diferencia de confianza, la perdedora se considera una
 *  competidora real y no una asignacion floja. */
const CREDIBLE_COMPETITOR_GAP = 0.15;

export interface ConflictCandidate {
  readonly offerLineNo: number;
  readonly requisitionItemId: string;
  readonly confidence: number;
  /** True si la linea trae el flag alternative_line. */
  readonly isAlternative: boolean;
}

export interface ConflictResolution {
  readonly offerLineNo: number;
  /** null cuando la linea perdio el conflicto y queda sin item asignado. */
  readonly requisitionItemId: string | null;
  /** null significa "conserva el estado que ya tenia". */
  readonly status: ReconciliationStatus | null;
  readonly needsReview: boolean;
  readonly note: string;
}

export interface ConflictOutcome {
  /** Solo las lineas afectadas por algun conflicto. */
  readonly resolutions: readonly ConflictResolution[];
  readonly conflictCount: number;
}

export function resolveConflicts(candidates: readonly ConflictCandidate[]): ConflictOutcome {
  const byItem = new Map<string, ConflictCandidate[]>();

  for (const candidate of candidates) {
    const list = byItem.get(candidate.requisitionItemId) ?? [];
    list.push(candidate);
    byItem.set(candidate.requisitionItemId, list);
  }

  const resolutions: ConflictResolution[] = [];
  let conflictCount = 0;

  for (const [, claimants] of byItem) {
    if (claimants.length < 2) continue;
    conflictCount++;

    // Ante empate exacto gana la linea mas baja, para que dos corridas sobre
    // los mismos datos den siempre lo mismo.
    const ordered = [...claimants].sort(
      (a, b) => b.confidence - a.confidence || a.offerLineNo - b.offerLineNo,
    );

    const winner = ordered[0]!;
    const losers = ordered.slice(1);

    resolutions.push({
      offerLineNo: winner.offerLineNo,
      requisitionItemId: winner.requisitionItemId,
      status: null,
      needsReview: true,
      note:
        `otra(s) ${losers.length} linea(s) de la oferta apuntan al mismo item ` +
        `(${losers.map((c) => `#${c.offerLineNo}`).join(', ')}): ` +
        `gano esta por confianza ${winner.confidence.toFixed(2)}`,
    });

    for (const loser of losers) {
      const gap = winner.confidence - loser.confidence;
      const isCredibleAlternative = loser.isAlternative && gap <= CREDIBLE_COMPETITOR_GAP;

      resolutions.push({
        offerLineNo: loser.offerLineNo,
        // Se conserva el vinculo: es la mejor hipotesis que hay y el comprador
        // necesita verla.
        requisitionItemId: loser.requisitionItemId,
        status: isCredibleAlternative ? 'alternative' : 'ambiguous',
        needsReview: true,
        note: isCredibleAlternative
          ? `el proveedor la ofrece como alternativa de la linea #${winner.offerLineNo} para el mismo item`
          : `reclama el mismo item que la linea #${winner.offerLineNo}, que gano por confianza ` +
            `(${winner.confidence.toFixed(2)} contra ${loser.confidence.toFixed(2)}): ` +
            `no se puede determinar a que item corresponde esta linea`,
      });
    }
  }

  return { resolutions, conflictCount };
}
