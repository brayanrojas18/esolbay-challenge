import type { ReconciliationStatus } from './status.js';

/**
 * Nivel 3 de la cascada: dos lineas ofertadas que reclaman el mismo item.
 *
 * El caso real del dataset:
 *   linea 153  "Recambio mopa microfibra"             -> item #153 "Repuesto mopa microfibra"
 *   linea 175  "Recambio mopa algodon uso industrial" -> item #153 tambien
 *
 * Las dos son mopas de repuesto y el prefiltro vectorial las manda al mismo
 * lugar. Sin resolucion de conflictos, la segunda pisaria a la primera o
 * quedaria un match duplicado silencioso, que es lo peor que le puede pasar a
 * un comparativo de compras.
 *
 * Regla: gana la de mayor confianza. La perdedora NO se descarta ni se degrada
 * a `extra`.
 *
 * Por que NO a `extra`: `extra` afirma "el proveedor cotizo algo que no
 * pediste". Es una afirmacion con confianza. Perder un conflicto es
 * exactamente lo contrario: significa que el sistema no pudo distinguir a que
 * item corresponde esta linea. Marcarla `extra` le miente al comprador.
 *
 * El caso que lo dejo en evidencia: las lineas 16 a 19 del PDF son
 * "Interruptor automatico 2 polos" de 10, 16, 25 y 32 A. Las cuatro reclamaron
 * el mismo item. Degradadas a `extra`, el comprador leia que no habia pedido
 * ninguna de las cuatro, cuando en realidad habia pedido las cuatro.
 *
 * Entonces:
 *   - Competidora creible con flag de alternativa -> `alternative`, conserva el
 *     vinculo. Es el caso de la mopa de algodon contra la de microfibra.
 *   - Todo lo demas -> `ambiguous`, conserva el vinculo como propuesta y queda
 *     marcada para revision con sus candidatos a la vista.
 */

/**
 * Diferencia maxima de confianza para considerar que la perdedora era una
 * competidora creible y no una asignacion floja. Por encima de esto, la
 * distancia entre las dos indica que la perdedora nunca fue del mismo item.
 */
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

    // Desempate estable: primero por confianza, y ante empate exacto gana la
    // linea de numero mas bajo. Sin el segundo criterio, dos corridas sobre los
    // mismos datos podrian dar resultados distintos.
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
        // El vinculo se conserva en los dos casos: en `alternative` porque es
        // una opcion real para ese item, y en `ambiguous` porque es la mejor
        // hipotesis que tiene el sistema y el comprador necesita verla.
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
