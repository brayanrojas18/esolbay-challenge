import type { ReportData } from './data.js';

/**
 * Reporte en JSON: la salida completa, con los candidatos de todas las lineas y
 * no solo las dudosas. Para inspeccionar una decision puntual o para que otro
 * sistema lo consuma.
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
