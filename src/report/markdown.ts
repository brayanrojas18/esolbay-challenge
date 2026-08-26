import type { ReportData, ReportLine } from './data.js';
import {
  DECIDED_BY_LABEL,
  STATUS_DESCRIPTION,
  STATUS_LABEL,
  delta,
  flagLabels,
  md,
  money,
  pct,
  qty,
} from './format.js';
import type { ReconciliationStatus } from '../reconcile/status.js';

/**
 * Reporte en Markdown, escrito para un comprador y no para un dev.
 *
 * El orden importa: primero el resumen con las alertas, despues el detalle y la
 * trazabilidad al final. Quien adjudica no deberia scrollear para encontrar los
 * problemas.
 */
export function renderMarkdown(data: ReportData): string {
  const out: string[] = [];
  const { summary, offer } = data;

  out.push(`# Analisis de oferta: ${offer.providerName}`);
  out.push('');
  out.push(`Solicitud **${data.requisitionCode}** - ${data.requisitionTitle}`);
  out.push('');

  /* --- 1. Resumen ejecutivo --------------------------------------------- */

  out.push('## Resumen ejecutivo');
  out.push('');
  out.push('| | |');
  out.push('|---|---|');
  out.push(`| Proveedor | ${md(offer.providerName)} |`);
  out.push(`| Cotizacion | ${offer.quoteCode ?? '(sin codigo)'} |`);
  out.push(`| Fecha | ${offer.quoteDate ?? '(sin fecha)'} |`);
  out.push(`| Archivo | \`${offer.sourceFilename}\` (${offer.sourceFormat.toUpperCase()}) |`);
  if (offer.terms) out.push(`| Condiciones | ${md(offer.terms)} |`);
  out.push('');

  const notCovered = summary.requisitionItems - summary.covered - summary.ambiguousItems;
  out.push(
    `**Cobertura: ${summary.covered} de ${summary.requisitionItems} items pedidos ` +
      `(${pct(summary.coveragePct)}).**`,
  );
  out.push('');
  if (summary.ambiguousItems > 0) {
    out.push(
      `${summary.ambiguousItems} item(s) tienen una linea propuesta pero sin confianza suficiente, ` +
        `y ${notCovered} no fueron cotizados.`,
    );
    out.push('');
  }

  out.push('### Desglose');
  out.push('');
  out.push('| Estado | Lineas | Que significa |');
  out.push('|---|---:|---|');
  for (const [status, count] of orderedStatuses(summary.byStatus)) {
    out.push(
      `| ${STATUS_LABEL[status] ?? status} | ${count} | ${STATUS_DESCRIPTION[status] ?? ''} |`,
    );
  }
  out.push('');

  out.push('### Totales');
  out.push('');
  out.push('| | |');
  out.push('|---|---:|');
  out.push(`| Total cotizado por el proveedor | ${money(summary.quotedTotal)} |`);
  out.push(`| **Total comparable** (solo lo que se pidio) | **${money(summary.comparableTotal)}** |`);
  out.push(`| Sobrantes no pedidos | ${money(summary.extrasTotal)} |`);
  out.push('');
  out.push(
    '> El total comparable es el que sirve para poner a este proveedor contra otro: ' +
      'los sobrantes no se pidieron y sumarlos inflaria la comparacion.',
  );
  out.push('');

  /* --- 2. Alertas accionables -------------------------------------------- */

  out.push('## Alertas');
  out.push('');
  out.push(`**${summary.needsReview} linea(s) requieren revision del comprador.**`);
  out.push('');

  const missing = data.lines.filter((l) => l.status === 'missing_from_offer');
  if (missing.length > 0) {
    out.push(`### No cotizados (${missing.length})`);
    out.push('');
    for (const line of missing.slice(0, 60)) {
      out.push(`- **#${line.requisitionLineNo}** ${md(line.requestedDescription)} (${qty(line.requestedQuantity)} ${line.requestedUnit ?? ''})`);
    }
    if (missing.length > 60) out.push(`- ... y ${missing.length - 60} mas (ver tabla conciliada)`);
    out.push('');
  }

  const shortfalls = data.lines.filter((l) => (l.quantityDelta ?? 0) < 0);
  if (shortfalls.length > 0) {
    out.push(`### Cotizados por debajo de lo pedido (${shortfalls.length})`);
    out.push('');
    out.push('| Item | Pedido | Ofrecido | Falta |');
    out.push('|---|---:|---:|---:|');
    for (const line of shortfalls) {
      out.push(
        `| #${line.requisitionLineNo} ${md(line.requestedDescription)} | ${qty(line.requestedQuantity)} | ` +
          `${qty(line.offeredQuantity)} | ${qty(Math.abs(line.quantityDelta!))} |`,
      );
    }
    out.push('');
  }

  const equivalents = data.lines.filter((l) => l.status === 'semantic_match');
  if (equivalents.length > 0) {
    out.push(`### Equivalentes tecnicos propuestos (${equivalents.length})`);
    out.push('');
    out.push('Requieren aprobacion: el proveedor ofrece un producto distinto al pedido.');
    out.push('');
    out.push('| Pedido | Ofrecido |');
    out.push('|---|---|');
    for (const line of equivalents) {
      out.push(`| #${line.requisitionLineNo} ${md(line.requestedDescription)} | ${md(line.offeredDescription)} |`);
    }
    out.push('');
  }

  const ambiguous = data.lines.filter((l) => l.status === 'ambiguous');
  if (ambiguous.length > 0) {
    out.push(`### Dudosos (${ambiguous.length})`);
    out.push('');
    out.push('El sistema no pudo determinar a que item corresponden. Decide el comprador.');
    out.push('');
    out.push('| Linea | Ofrecido | Mejor hipotesis | Confianza |');
    out.push('|---:|---|---|---:|');
    for (const line of ambiguous) {
      out.push(
        `| ${line.offerLineNo} | ${md(line.offeredDescription)} | ` +
          `${line.requisitionLineNo ? `#${line.requisitionLineNo} ${md(line.requestedDescription)}` : '-'} | ` +
          `${line.confidence.toFixed(2)} |`,
      );
    }
    out.push('');
  }

  /* --- 3. Oferta procesada ------------------------------------------------ */

  out.push('## Oferta procesada');
  out.push('');
  out.push(`Las ${data.offerItems.length} lineas extraidas del archivo original.`);
  out.push('');
  out.push('| # | Codigo | Descripcion | Cant. | Unidad | P. unitario | Subtotal | Observaciones |');
  out.push('|---:|---|---|---:|---|---:|---:|---|');
  for (const item of data.offerItems) {
    out.push(
      `| ${item.lineNo} | ${item.supplierCode ?? ''} | ${md(item.description)} | ` +
        `${qty(item.quantity)} | ${item.rawUnit ?? ''} | ${money(item.unitPrice)} | ` +
        `${money(item.subtotal)} | ${flagLabels(item.flags)} |`,
    );
  }
  out.push('');

  /* --- 4. Tabla conciliada ------------------------------------------------ */

  out.push('## Tabla conciliada');
  out.push('');
  out.push('Ordenada poniendo primero lo que requiere atencion.');
  out.push('');
  out.push('| Item pedido | Linea ofertada | Estado | Cant. pedida | Cant. ofrecida | Delta | Confianza | Motivo |');
  out.push('|---|---|---|---:|---:|---:|---:|---|');
  for (const line of data.lines) {
    out.push(renderRow(line));
  }
  out.push('');

  /* --- 5. Trazabilidad ---------------------------------------------------- */

  out.push(renderTraceability(data));

  return out.join('\n');
}

function renderRow(line: ReportLine): string {
  const requested =
    line.requisitionLineNo === null ? '-' : `#${line.requisitionLineNo} ${md(line.requestedDescription)}`;
  const offered =
    line.offerLineNo === null ? '-' : `L${line.offerLineNo} ${md(line.offeredDescription)}`;
  const mark = line.needsReview ? ' ⚠' : '';

  return (
    `| ${requested} | ${offered} | ${STATUS_LABEL[line.status] ?? line.status}${mark} | ` +
    `${qty(line.requestedQuantity)} | ${qty(line.offeredQuantity)} | ${delta(line.quantityDelta)} | ` +
    `${line.confidence.toFixed(2)} | ${md(line.reasoning)} |`
  );
}

export function renderTraceability(data: ReportData): string {
  const out: string[] = [];
  const meta = data.offer.extractionMeta;
  const m = data.summary.metrics;

  out.push('## Trazabilidad');
  out.push('');
  out.push('### Extraccion');
  out.push('');
  if (meta) {
    out.push('| | |');
    out.push('|---|---|');
    out.push(`| Estrategia | ${meta.strategy} |`);
    out.push(`| Modelo | ${meta.modelUsed ?? 'ninguno (deterministico)'} |`);
    out.push(`| Llamadas al LLM | ${meta.llmCalls} |`);
    out.push(`| Lotes | ${meta.batches} |`);
    out.push(`| Tokens entrada / salida | ${meta.inputTokens} / ${meta.outputTokens} |`);
    out.push(`| Duracion | ${Math.round(meta.durationMs)} ms |`);
    out.push(`| SHA-256 del archivo | \`${meta.sourceHash.slice(0, 16)}...\` |`);
    out.push('');

    if (meta.warnings.length > 0) {
      out.push(`**Avisos de extraccion (${meta.warnings.length}):**`);
      out.push('');
      for (const warning of meta.warnings.slice(0, 30)) {
        out.push(`- \`${warning.code}\`${warning.lineNo ? ` (linea ${warning.lineNo})` : ''}: ${md(warning.message)}`);
      }
      if (meta.warnings.length > 30) out.push(`- ... y ${meta.warnings.length - 30} mas`);
      out.push('');
    } else {
      out.push('Sin avisos de extraccion.');
      out.push('');
    }
  }

  out.push('### Conciliacion');
  out.push('');
  out.push('| | |');
  out.push('|---|---|');
  out.push(`| Estrategia | ${data.strategyVersion} |`);
  out.push(`| Modelo | ${data.modelUsed ?? 'ninguno (matcher lexico local)'} |`);
  out.push(`| Resueltas por alias | ${m.resolvedByAlias} |`);
  out.push(`| Resueltas por LLM | ${m.resolvedByLlm} |`);
  out.push(`| Resueltas por similitud lexica | ${m.resolvedByLexical} |`);
  out.push(`| Conflictos resueltos | ${m.conflicts} |`);
  out.push(`| Llamadas al LLM | ${m.llmCalls} en ${m.llmBatches} lotes |`);
  out.push(`| Tokens entrada / salida | ${m.inputTokens} / ${m.outputTokens} |`);
  out.push('');

  out.push('### Volumen');
  out.push('');
  out.push(
    `Conciliar ${m.offerLines} lineas ofertadas contra ${m.requisitionItems} items solicitados ` +
      `por fuerza bruta serian **${m.bruteForceComparisons.toLocaleString('es-AR')} comparaciones**.`,
  );
  out.push('');
  out.push(
    `Con el prefiltro vectorial fueron **${m.prefilterQueries} query indexada** ` +
      `(HNSW + distancia coseno, dentro de Postgres) en ${Math.round(m.prefilterMs)} ms, ` +
      `y el decisor evaluo 5 candidatos por linea en vez de ${m.requisitionItems}.`,
  );
  out.push('');

  /* --- Candidatos evaluados, para las decisiones no triviales ------------- */

  const nonTrivial = data.lines.filter(
    (l) => l.needsReview && l.candidates.length > 0 && l.status !== 'missing_from_offer',
  );

  if (nonTrivial.length > 0) {
    out.push('### Candidatos evaluados en las decisiones no triviales');
    out.push('');
    out.push('Cada linea con su top-5 y el score de similitud que devolvio pgvector.');
    out.push('');
    for (const line of nonTrivial.slice(0, 40)) {
      out.push(
        `**L${line.offerLineNo}** "${md(line.offeredDescription)}" -> ` +
          `${STATUS_LABEL[line.status]} (${DECIDED_BY_LABEL[line.decidedBy] ?? line.decidedBy}, ` +
          `confianza ${line.confidence.toFixed(2)})`,
      );
      out.push('');
      for (const candidate of line.candidates) {
        const chosen = candidate.lineNo === line.requisitionLineNo ? ' **<- elegido**' : '';
        out.push(`- \`${candidate.score.toFixed(3)}\` #${candidate.lineNo} ${md(candidate.description)}${chosen}`);
      }
      out.push('');
    }
    if (nonTrivial.length > 40) {
      out.push(`_... y ${nonTrivial.length - 40} decisiones mas (ver el JSON para el detalle completo)._`);
      out.push('');
    }
  }

  out.push('---');
  out.push('');
  out.push(
    `Conciliacion \`${data.reconciliationId}\` generada el ` +
      `${new Date(data.createdAt).toLocaleString('es-AR')}.`,
  );

  return out.join('\n');
}

function orderedStatuses(byStatus: Record<string, number>): [ReconciliationStatus, number][] {
  const order: ReconciliationStatus[] = [
    'match',
    'partial_quantity',
    'semantic_match',
    'alternative',
    'ambiguous',
    'missing_from_offer',
    'extra',
  ];
  return order
    .filter((s) => byStatus[s] !== undefined)
    .map((s) => [s, byStatus[s]!] as [ReconciliationStatus, number]);
}
