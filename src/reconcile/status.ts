import type { Flag } from '../extract/normalize.js';

/**
 * Estados de conciliacion.
 *
 * El enunciado dice textual: "No imponemos estados especificos de conciliacion.
 * Esperamos que disenies una forma clara de representar el resultado y
 * justificarlo". Se eligio el vocabulario de la guia de los escenarios --
 * match, partial_quantity, semantic_match, missing_from_offer, extra -- porque
 * es el que ya usa el material del challenge, y asi el test de regresion
 * compara uno a uno sin tabla de traduccion.
 *
 * Se agregan dos estados propios:
 *   - `alternative`: el proveedor cotiza DOS lineas para el mismo item pedido.
 *     La guia no lo contempla porque etiqueta esas lineas como `extra`, pero
 *     para el comprador no es lo mismo un producto que no pidio que una segunda
 *     opcion para algo que si pidio.
 *   - `ambiguous`: el sistema no pudo decidir. No es un fallo: un sistema que
 *     admite que no sabe le sirve mas a un comprador que uno que inventa.
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
 * Decide el estado de una linea que YA fue matcheada con un item solicitado.
 *
 * Precedencia, verificada contra la guia de los dos escenarios:
 *   1. Cantidad distinta -> partial_quantity. Siempre gana: en las 34 filas de
 *      la guia con cantidad distinta, ninguna esta etiquetada de otra forma.
 *   2. Equivalente tecnico -> semantic_match.
 *   3. Resto -> match.
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
    // El signo importa y no es un detalle: que el proveedor tenga MENOS del que
    // se pidio es un problema de abastecimiento; que redondee hacia ARRIBA por
    // presentacion comercial es neutro o hasta conveniente.
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
