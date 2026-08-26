import { MatchingError } from '../core/errors.js';
import { sqlConnection } from '../db/client.js';
import type { ExtractionMeta } from '../extract/schemas.js';
import type { ReconciliationSummary } from '../reconcile/persist.js';
import { statusPriority, type ReconciliationStatus } from '../reconcile/status.js';

/**
 * Carga todo lo necesario para un reporte en una sola pasada.
 *
 * Los tres formatos (markdown, json, html) consumen esta misma estructura: la
 * consulta a la base se escribe una vez y los renderers no saben de SQL.
 */

export interface ReportOffer {
  readonly id: string;
  readonly providerName: string;
  readonly quoteCode: string | null;
  readonly quoteDate: string | null;
  readonly terms: string | null;
  readonly sourceFilename: string;
  readonly sourceFormat: string;
  readonly currency: string | null;
  readonly extractionMeta: ExtractionMeta | null;
}

export interface ReportOfferItem {
  readonly lineNo: number;
  readonly supplierCode: string | null;
  readonly description: string;
  readonly quantity: number;
  readonly unitOfMeasure: string | null;
  readonly rawUnit: string | null;
  readonly unitPrice: number | null;
  readonly subtotal: number | null;
  readonly rawNotes: string | null;
  readonly flags: readonly string[];
}

export interface ReportLine {
  readonly status: ReconciliationStatus;
  readonly confidence: number;
  readonly quantityDelta: number | null;
  readonly priceTotal: number | null;
  readonly reasoning: string;
  readonly needsReview: boolean;
  readonly decidedBy: string;
  readonly candidates: readonly { lineNo: number; description: string; score: number }[];
  readonly requisitionLineNo: number | null;
  readonly requestedDescription: string | null;
  readonly requestedQuantity: number | null;
  readonly requestedUnit: string | null;
  readonly offerLineNo: number | null;
  readonly offeredDescription: string | null;
  readonly offeredQuantity: number | null;
  readonly offeredUnit: string | null;
}

export interface ReportData {
  readonly reconciliationId: string;
  readonly createdAt: string;
  readonly strategyVersion: string;
  readonly modelUsed: string | null;
  readonly requisitionCode: string;
  readonly requisitionTitle: string;
  readonly offer: ReportOffer;
  readonly offerItems: readonly ReportOfferItem[];
  readonly lines: readonly ReportLine[];
  readonly summary: ReconciliationSummary;
}

export async function loadReportData(reconciliationId: string): Promise<ReportData> {
  const sql = sqlConnection();

  const [head] = await sql<
    {
      id: string;
      created_at: Date | string;
      strategy_version: string;
      model_used: string | null;
      summary: ReconciliationSummary;
      requisition_code: string;
      requisition_title: string;
      offer_id: string;
      provider_name: string;
      quote_code: string | null;
      quote_date: string | null;
      terms: string | null;
      source_filename: string;
      source_format: string;
      currency: string | null;
      extraction_meta: ExtractionMeta | null;
    }[]
  >`
    SELECT r.id, r.created_at, r.strategy_version, r.model_used, r.summary,
           q.code AS requisition_code, q.title AS requisition_title,
           o.id AS offer_id, p.name AS provider_name, o.quote_code, o.quote_date,
           o.terms, o.source_filename, o.source_format, o.currency, o.extraction_meta
    FROM reconciliations r
    JOIN offers o       ON o.id = r.offer_id
    JOIN providers p    ON p.id = o.provider_id
    JOIN requisitions q ON q.id = r.requisition_id
    WHERE r.id = ${reconciliationId}
  `;

  if (!head) {
    throw new MatchingError('no existe esa conciliacion', { reconciliationId });
  }

  const offerItems = await sql<
    {
      line_no: number;
      supplier_code: string | null;
      offered_description: string;
      offered_quantity: string;
      unit_of_measure: string | null;
      raw_unit: string | null;
      unit_price: string | null;
      raw_notes: string | null;
      flags: string[];
    }[]
  >`
    SELECT line_no, supplier_code, offered_description, offered_quantity,
           unit_of_measure, raw_unit, unit_price, raw_notes, flags
    FROM offer_items
    WHERE offer_id = ${head.offer_id}
    ORDER BY line_no
  `;

  const lines = await sql<
    {
      status: ReconciliationStatus;
      confidence: string;
      quantity_delta: string | null;
      price_total: string | null;
      reasoning: string;
      needs_review: boolean;
      decided_by: string;
      candidates: { lineNo: number; description: string; score: number }[] | null;
      requisition_line_no: number | null;
      requested_description: string | null;
      requested_quantity: string | null;
      requested_unit: string | null;
      offer_line_no: number | null;
      offered_description: string | null;
      offered_quantity: string | null;
      offered_unit: string | null;
    }[]
  >`
    SELECT rl.status, rl.confidence, rl.quantity_delta, rl.price_total, rl.reasoning,
           rl.needs_review, rl.decided_by, rl.candidates,
           ri.line_no AS requisition_line_no,
           ri.raw_description AS requested_description,
           ri.quantity AS requested_quantity,
           -- La unidad cruda, no la canonica: el reporte lo lee un comprador
           -- que escribio "unidad", no "unit".
           COALESCE(ri.raw_unit, ri.unit_of_measure) AS requested_unit,
           oi.line_no AS offer_line_no,
           oi.offered_description,
           oi.offered_quantity,
           COALESCE(oi.raw_unit, oi.unit_of_measure) AS offered_unit
    FROM reconciliation_lines rl
    LEFT JOIN requisition_items ri ON ri.id = rl.requisition_item_id
    LEFT JOIN offer_items oi       ON oi.id = rl.offer_item_id
    WHERE rl.reconciliation_id = ${reconciliationId}
  `;

  const mapped: ReportLine[] = lines.map((r) => ({
    status: r.status,
    confidence: Number(r.confidence),
    quantityDelta: r.quantity_delta === null ? null : Number(r.quantity_delta),
    priceTotal: r.price_total === null ? null : Number(r.price_total),
    reasoning: r.reasoning,
    needsReview: r.needs_review,
    decidedBy: r.decided_by,
    candidates: r.candidates ?? [],
    requisitionLineNo: r.requisition_line_no,
    requestedDescription: r.requested_description,
    requestedQuantity: r.requested_quantity === null ? null : Number(r.requested_quantity),
    requestedUnit: r.requested_unit,
    offerLineNo: r.offer_line_no,
    offeredDescription: r.offered_description,
    offeredQuantity: r.offered_quantity === null ? null : Number(r.offered_quantity),
    offeredUnit: r.offered_unit,
  }));

  // Orden de presentacion: primero lo que requiere atencion. El comprador no
  // deberia tener que scrollear para encontrar los problemas.
  mapped.sort(
    (a, b) =>
      statusPriority(a.status) - statusPriority(b.status) ||
      a.confidence - b.confidence ||
      (a.requisitionLineNo ?? a.offerLineNo ?? 0) - (b.requisitionLineNo ?? b.offerLineNo ?? 0),
  );

  return {
    reconciliationId: head.id,
    createdAt: new Date(head.created_at).toISOString(),
    strategyVersion: head.strategy_version,
    modelUsed: head.model_used,
    requisitionCode: head.requisition_code,
    requisitionTitle: head.requisition_title,
    offer: {
      id: head.offer_id,
      providerName: head.provider_name,
      quoteCode: head.quote_code,
      quoteDate: head.quote_date,
      terms: head.terms,
      sourceFilename: head.source_filename,
      sourceFormat: head.source_format,
      currency: head.currency,
      extractionMeta: head.extraction_meta,
    },
    offerItems: offerItems.map((r) => {
      const quantity = Number(r.offered_quantity);
      const unitPrice = r.unit_price === null ? null : Number(r.unit_price);
      return {
        lineNo: r.line_no,
        supplierCode: r.supplier_code,
        description: r.offered_description,
        quantity,
        unitOfMeasure: r.unit_of_measure,
        rawUnit: r.raw_unit,
        unitPrice,
        subtotal: unitPrice === null ? null : Math.round(unitPrice * quantity * 100) / 100,
        rawNotes: r.raw_notes,
        flags: r.flags,
      };
    }),
    lines: mapped,
    summary: head.summary,
  };
}
