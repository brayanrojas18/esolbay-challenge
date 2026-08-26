import type { ReportData } from './data.js';

/**
 * Reporte en JSON.
 *
 * Es la salida completa y sin recortes: incluye los candidatos evaluados de
 * TODAS las lineas, no solo las no triviales como el markdown. Sirve para
 * inspeccionar una decision puntual o para que otro sistema consuma el
 * resultado.
 */
export function renderJson(data: ReportData): string {
  return JSON.stringify(
    {
      reconciliation: {
        id: data.reconciliationId,
        createdAt: data.createdAt,
        strategyVersion: data.strategyVersion,
        modelUsed: data.modelUsed,
      },
      requisition: {
        code: data.requisitionCode,
        title: data.requisitionTitle,
      },
      offer: data.offer,
      summary: data.summary,
      offerItems: data.offerItems,
      reconciledLines: data.lines,
    },
    null,
    2,
  );
}
