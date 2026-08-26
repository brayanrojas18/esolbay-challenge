import type { Flag } from '../extract/normalize.js';

/**
 * Estados de conciliacion.
 *
 * El enunciado no impone ninguno. Se tomo el vocabulario de la guia de los
 * escenarios, asi el test de regresion compara sin tabla de traduccion, y se
 * agregaron dos: `alternative` para cuando el proveedor cotiza dos lineas del
 * mismo item, y `ambiguous` para cuando el sistema no puede decidir.
 */
export const STATUSES = [
  'match',
  'partial_quantity',
  'semantic_match',
  'alternative',
  'missing_from_offer',
  'extra',
  'ambiguous',
] as const;

export type ReconciliationStatus = (typeof STATUSES)[number];

export const DECIDED_BY = ['exact_code', 'alias', 'vector+llm', 'llm', 'lexical', 'unmatched'] as const;
export type DecidedBy = (typeof DECIDED_BY)[number];

/** Debajo de esta confianza, la linea se marca `ambiguous`. */
export const AMBIGUOUS_THRESHOLD = 0.6;

/** Estados que un comprador tiene que mirar si o si. */
const NEEDS_REVIEW: ReadonlySet<ReconciliationStatus> = new Set([
  'semantic_match',
  'alternative',
  'ambiguous',
  'missing_from_offer',
]);

export function needsReview(status: ReconciliationStatus, confidence: number): boolean {
  return NEEDS_REVIEW.has(status) || confidence < AMBIGUOUS_THRESHOLD;
}

/** Orden de presentacion: primero lo que requiere atencion. */
const PRIORITY: Record<ReconciliationStatus, number> = {
  ambiguous: 0,
  missing_from_offer: 1,
  semantic_match: 2,
  alternative: 3,
  partial_quantity: 4,
  extra: 5,
  match: 6,
};

export function statusPriority(status: ReconciliationStatus): number {
  return PRIORITY[status];
}

export interface StatusInput {
  readonly requestedQuantity: number;
  readonly offeredQuantity: number;
  readonly flags: readonly Flag[];
  readonly confidence: number;
}

export interface StatusOutcome {
  readonly status: ReconciliationStatus;
  /** ofertado - pedido. Negativo = el proveedor tiene menos del que se pidio. */
  readonly quantityDelta: number;
  readonly reasoning: string;
}

/**
 * Estado de una linea ya matcheada. La precedencia esta verificada contra las
 * dos guias: cantidad distinta siempre gana, despues equivalente tecnico, y el
 * resto es match.
 */
export function resolveStatus({
  requestedQuantity,
  offeredQuantity,
  flags,
  confidence,
}: StatusInput): StatusOutcome {
  const quantityDelta = offeredQuantity - requestedQuantity;

  if (confidence < AMBIGUOUS_THRESHOLD) {
    return {
      status: 'ambiguous',
      quantityDelta,
      reasoning: `confianza ${confidence.toFixed(2)}, por debajo del umbral de ${AMBIGUOUS_THRESHOLD}`,
    };
  }

  if (quantityDelta !== 0) {
    // El signo importa: menos stock del pedido es un problema; redondear hacia
    // arriba por presentacion comercial no lo es.
    const short = quantityDelta < 0;
    const detail = short
      ? `el proveedor ofrece ${offeredQuantity} de las ${requestedQuantity} pedidas (faltan ${Math.abs(quantityDelta)})`
      : `el proveedor ofrece ${offeredQuantity} contra ${requestedQuantity} pedidas (${quantityDelta} de mas, probable presentacion comercial)`;

    return { status: 'partial_quantity', quantityDelta, reasoning: detail };
  }

  if (flags.includes('technical_equivalent')) {
    return {
      status: 'semantic_match',
      quantityDelta,
      reasoning: 'el proveedor lo ofrece como equivalente tecnico: requiere aprobacion del comprador',
    };
  }

  return { status: 'match', quantityDelta, reasoning: 'mismo producto y misma cantidad' };
}

/** True si el delta perjudica al comprador (menos stock del pedido). */
export function isShortfall(quantityDelta: number | null): boolean {
  return quantityDelta !== null && quantityDelta < 0;
}
