import type { ReconciliationStatus } from '../reconcile/status.js';

/** Formateo compartido por los tres renderers. */

export function money(value: number | null | undefined, currency = '$'): string {
  if (value === null || value === undefined) return '-';
  return `${currency} ${value.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function qty(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return value.toLocaleString('es-AR', { maximumFractionDigits: 3 });
}

export function delta(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) return '-';
  const formatted = qty(Math.abs(value));
  return value > 0 ? `+${formatted}` : `-${formatted}`;
}

export function pct(value: number): string {
  return `${value.toFixed(1)}%`;
}

/** Etiquetas en castellano, para que el reporte lo lea un comprador. */
export const STATUS_LABEL: Record<ReconciliationStatus, string> = {
  match: 'Coincidencia',
  partial_quantity: 'Cantidad parcial',
  semantic_match: 'Equivalente tecnico',
  alternative: 'Alternativa',
  missing_from_offer: 'No cotizado',
  extra: 'Sobrante',
  ambiguous: 'Dudoso',
};

export const STATUS_DESCRIPTION: Record<ReconciliationStatus, string> = {
  match: 'mismo producto y misma cantidad',
  partial_quantity: 'mismo producto, cantidad distinta a la pedida',
  semantic_match: 'el proveedor lo ofrece como equivalente tecnico',
  alternative: 'segunda opcion del proveedor para un item ya cubierto',
  missing_from_offer: 'pedido pero no cotizado',
  extra: 'cotizado pero no pedido',
  ambiguous: 'el sistema no pudo determinarlo con confianza',
};

export const DECIDED_BY_LABEL: Record<string, string> = {
  exact_code: 'codigo exacto',
  alias: 'alias confirmado',
  'vector+llm': 'vectorial + LLM',
  llm: 'LLM',
  lexical: 'similitud lexica',
  unmatched: 'sin asignar',
};

export const FLAG_LABEL: Record<string, string> = {
  technical_equivalent: 'equivalente tecnico',
  alternative_line: 'linea alternativa',
  partial_stock: 'stock parcial',
  min_order_qty: 'bulto minimo',
  brand_to_confirm: 'marca a confirmar',
  extra_suggested: 'adicional sugerido',
};

export function flagLabels(flags: readonly string[]): string {
  if (flags.length === 0) return '';
  return flags.map((f) => FLAG_LABEL[f] ?? f).join(', ');
}

/** Escapa el pipe para que no rompa una tabla de markdown. */
export function md(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}
