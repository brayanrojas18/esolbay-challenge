import type { ReportData, ReportLine } from './data.js';
import {
  DECIDED_BY_LABEL,
  STATUS_DESCRIPTION,
  STATUS_LABEL,
  delta,
  flagLabels,
  money,
  pct,
  qty,
} from './format.js';
import type { ReconciliationStatus } from '../reconcile/status.js';

/**
 * Reporte HTML: un solo archivo autocontenido, sin build ni dependencias.
 *
 * Mismo contenido que el markdown, con color por estado y las filas que
 * requieren atencion arriba de todo. Se abre con doble clic.
 */

const STATUS_COLOR: Record<ReconciliationStatus, string> = {
  match: '#16a34a',
  partial_quantity: '#d97706',
  semantic_match: '#7c3aed',
  alternative: '#0891b2',
  missing_from_offer: '#dc2626',
  extra: '#64748b',
  ambiguous: '#db2777',
};

function esc(text: string | null | undefined): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function badge(status: ReconciliationStatus): string {
  return `<span class="badge" style="--c:${STATUS_COLOR[status]}">${esc(STATUS_LABEL[status] ?? status)}</span>`;
}

export function renderHtml(data: ReportData): string {
  const { summary, offer } = data;
  const notCovered = summary.requisitionItems - summary.covered - summary.ambiguousItems;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(offer.providerName)} - ${esc(data.requisitionCode)}</title>
<style>
  :root {
    --bg: #ffffff; --fg: #0f172a; --muted: #64748b; --line: #e2e8f0;
    --panel: #f8fafc; --accent: #1d4ed8; --warn-bg: #fef3c7; --warn-fg: #92400e;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0f172a; --fg: #e2e8f0; --muted: #94a3b8; --line: #1e293b;
      --panel: #1e293b; --accent: #60a5fa; --warn-bg: #422006; --warn-fg: #fcd34d;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 2rem 1.25rem 4rem;
    background: var(--bg); color: var(--fg);
    font: 15px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  main { max-width: 1200px; margin: 0 auto; }
  h1 { font-size: 1.7rem; margin: 0 0 .25rem; letter-spacing: -.02em; }
  h2 { font-size: 1.2rem; margin: 2.5rem 0 .75rem; padding-bottom: .4rem; border-bottom: 2px solid var(--line); }
  h3 { font-size: 1rem; margin: 1.5rem 0 .5rem; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; }
  .sub { color: var(--muted); margin: 0 0 1.5rem; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: .75rem; margin: 1rem 0; }
  .card { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: .9rem 1rem; }
  .card .k { font-size: .75rem; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); }
  .card .v { font-size: 1.5rem; font-weight: 650; margin-top: .2rem; letter-spacing: -.02em; }
  .card .n { font-size: .8rem; color: var(--muted); }
  .meta { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 1rem 1.25rem; }
  .meta dl { display: grid; grid-template-columns: max-content 1fr; gap: .35rem 1.25rem; margin: 0; }
  .meta dt { color: var(--muted); font-size: .85rem; }
  .meta dd { margin: 0; }
  .scroll { overflow-x: auto; border: 1px solid var(--line); border-radius: 10px; margin: .75rem 0; }
  table { border-collapse: collapse; width: 100%; font-size: .85rem; }
  th { background: var(--panel); text-align: left; font-weight: 600; white-space: nowrap;
       padding: .6rem .7rem; border-bottom: 2px solid var(--line); position: sticky; top: 0; }
  td { padding: .5rem .7rem; border-bottom: 1px solid var(--line); vertical-align: top; }
  tr:last-child td { border-bottom: 0; }
  .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .badge { display: inline-block; padding: .1rem .5rem; border-radius: 99px; font-size: .72rem;
           font-weight: 600; white-space: nowrap; color: var(--c); border: 1px solid var(--c);
           background: color-mix(in srgb, var(--c) 12%, transparent); }
  .review { background: color-mix(in srgb, #f59e0b 8%, transparent); }
  .why { color: var(--muted); font-size: .8rem; max-width: 34rem; }
  .alert { background: var(--warn-bg); color: var(--warn-fg); border-radius: 10px;
           padding: .8rem 1.1rem; margin: 1rem 0; font-weight: 550; }
  .note { color: var(--muted); font-size: .85rem; border-left: 3px solid var(--line); padding-left: .9rem; margin: .75rem 0; }
  code { background: var(--panel); padding: .1rem .35rem; border-radius: 4px; font-size: .85em; }
  details { margin: .4rem 0; border: 1px solid var(--line); border-radius: 8px; padding: .5rem .8rem; }
  summary { cursor: pointer; font-size: .85rem; font-weight: 550; }
  details ul { margin: .5rem 0 .25rem; padding-left: 1.2rem; font-size: .82rem; color: var(--muted); }
  .chosen { color: var(--fg); font-weight: 600; }
  footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid var(--line);
           color: var(--muted); font-size: .8rem; }
</style>
</head>
<body>
<main>

<h1>${esc(offer.providerName)}</h1>
<p class="sub">
  Cotizacion ${esc(offer.quoteCode ?? 's/codigo')} &middot; ${esc(offer.quoteDate ?? 's/fecha')} &middot;
  solicitud <strong>${esc(data.requisitionCode)}</strong> &ndash; ${esc(data.requisitionTitle)}
</p>

<div class="cards">
  <div class="card">
    <div class="k">Cobertura</div>
    <div class="v">${pct(summary.coveragePct)}</div>
    <div class="n">${summary.covered} de ${summary.requisitionItems} items</div>
  </div>
  <div class="card">
    <div class="k">Total comparable</div>
    <div class="v">${esc(money(summary.comparableTotal))}</div>
    <div class="n">sin contar sobrantes</div>
  </div>
  <div class="card">
    <div class="k">A revisar</div>
    <div class="v">${summary.needsReview}</div>
    <div class="n">lineas requieren decision</div>
  </div>
  <div class="card">
    <div class="k">No cotizados</div>
    <div class="v">${notCovered}</div>
    <div class="n">items sin oferta</div>
  </div>
</div>

<div class="meta">
  <dl>
    <dt>Archivo</dt><dd><code>${esc(offer.sourceFilename)}</code> (${esc(offer.sourceFormat.toUpperCase())})</dd>
    ${offer.terms ? `<dt>Condiciones</dt><dd>${esc(offer.terms)}</dd>` : ''}
    <dt>Total cotizado</dt><dd>${esc(money(summary.quotedTotal))}</dd>
    <dt>Sobrantes</dt><dd>${esc(money(summary.extrasTotal))}</dd>
  </dl>
</div>

<p class="note">
  El <strong>total comparable</strong> es el que sirve para poner a este proveedor contra otro:
  los sobrantes no se pidieron y sumarlos inflaria la comparacion.
</p>

<h2>Desglose por estado</h2>
<div class="scroll">
<table>
  <thead><tr><th>Estado</th><th class="num">Lineas</th><th>Que significa</th></tr></thead>
  <tbody>
  ${orderedStatuses(summary.byStatus)
    .map(
      ([status, count]) =>
        `<tr><td>${badge(status)}</td><td class="num">${count}</td>` +
        `<td class="why">${esc(STATUS_DESCRIPTION[status] ?? '')}</td></tr>`,
    )
    .join('\n  ')}
  </tbody>
</table>
</div>

${renderAlerts(data)}

<h2>Tabla conciliada</h2>
<p class="sub">Ordenada poniendo primero lo que requiere atencion.</p>
<div class="scroll">
<table>
  <thead>
    <tr>
      <th>Item pedido</th><th>Linea ofertada</th><th>Estado</th>
      <th class="num">Pedida</th><th class="num">Ofrecida</th><th class="num">&Delta;</th>
      <th class="num">Conf.</th><th>Motivo</th>
    </tr>
  </thead>
  <tbody>
  ${data.lines.map(renderRow).join('\n  ')}
  </tbody>
</table>
</div>

<h2>Oferta procesada</h2>
<p class="sub">Las ${data.offerItems.length} lineas extraidas del archivo original.</p>
<div class="scroll">
<table>
  <thead>
    <tr>
      <th class="num">#</th><th>Codigo</th><th>Descripcion</th><th class="num">Cant.</th>
      <th>Unidad</th><th class="num">P. unitario</th><th class="num">Subtotal</th><th>Observaciones</th>
    </tr>
  </thead>
  <tbody>
  ${data.offerItems
    .map(
      (item) =>
        `<tr>
    <td class="num">${item.lineNo}</td>
    <td><code>${esc(item.supplierCode ?? '')}</code></td>
    <td>${esc(item.description)}</td>
    <td class="num">${esc(qty(item.quantity))}</td>
    <td>${esc(item.rawUnit ?? '')}</td>
    <td class="num">${esc(money(item.unitPrice))}</td>
    <td class="num">${esc(money(item.subtotal))}</td>
    <td class="why">${esc(flagLabels(item.flags))}</td>
  </tr>`,
    )
    .join('\n  ')}
  </tbody>
</table>
</div>

${renderTraceabilityHtml(data)}

<footer>
  Conciliacion <code>${esc(data.reconciliationId)}</code> &middot;
  generada el ${esc(new Date(data.createdAt).toLocaleString('es-AR'))} &middot;
  estrategia <code>${esc(data.strategyVersion)}</code>
</footer>

</main>
</body>
</html>`;
}

function renderRow(line: ReportLine): string {
  const requested =
    line.requisitionLineNo === null
      ? '<span style="color:var(--muted)">&mdash;</span>'
      : `<strong>#${line.requisitionLineNo}</strong> ${esc(line.requestedDescription)}`;
  const offered =
    line.offerLineNo === null
      ? '<span style="color:var(--muted)">&mdash;</span>'
      : `<strong>L${line.offerLineNo}</strong> ${esc(line.offeredDescription)}`;

  return `<tr${line.needsReview ? ' class="review"' : ''}>
    <td>${requested}</td>
    <td>${offered}</td>
    <td>${badge(line.status)}</td>
    <td class="num">${esc(qty(line.requestedQuantity))}</td>
    <td class="num">${esc(qty(line.offeredQuantity))}</td>
    <td class="num">${esc(delta(line.quantityDelta))}</td>
    <td class="num">${line.confidence.toFixed(2)}</td>
    <td class="why">${esc(line.reasoning)}</td>
  </tr>`;
}

function renderAlerts(data: ReportData): string {
  const out: string[] = ['<h2>Alertas</h2>'];
  out.push(
    `<div class="alert">${data.summary.needsReview} linea(s) requieren revision del comprador.</div>`,
  );

  const missing = data.lines.filter((l) => l.status === 'missing_from_offer');
  if (missing.length > 0) {
    out.push(`<h3>No cotizados (${missing.length})</h3>`);
    out.push('<div class="scroll"><table><thead><tr><th>Item</th><th class="num">Cantidad</th></tr></thead><tbody>');
    for (const line of missing) {
      out.push(
        `<tr><td><strong>#${line.requisitionLineNo}</strong> ${esc(line.requestedDescription)}</td>` +
          `<td class="num">${esc(qty(line.requestedQuantity))} ${esc(line.requestedUnit ?? '')}</td></tr>`,
      );
    }
    out.push('</tbody></table></div>');
  }

  const shortfalls = data.lines.filter((l) => (l.quantityDelta ?? 0) < 0);
  if (shortfalls.length > 0) {
    out.push(`<h3>Cotizados por debajo de lo pedido (${shortfalls.length})</h3>`);
    out.push(
      '<div class="scroll"><table><thead><tr><th>Item</th><th class="num">Pedido</th>' +
        '<th class="num">Ofrecido</th><th class="num">Falta</th></tr></thead><tbody>',
    );
    for (const line of shortfalls) {
      out.push(
        `<tr><td><strong>#${line.requisitionLineNo}</strong> ${esc(line.requestedDescription)}</td>` +
          `<td class="num">${esc(qty(line.requestedQuantity))}</td>` +
          `<td class="num">${esc(qty(line.offeredQuantity))}</td>` +
          `<td class="num">${esc(qty(Math.abs(line.quantityDelta!)))}</td></tr>`,
      );
    }
    out.push('</tbody></table></div>');
  }

  const equivalents = data.lines.filter((l) => l.status === 'semantic_match');
  if (equivalents.length > 0) {
    out.push(`<h3>Equivalentes tecnicos propuestos (${equivalents.length})</h3>`);
    out.push('<p class="note">Requieren aprobacion: el proveedor ofrece un producto distinto al pedido.</p>');
    out.push('<div class="scroll"><table><thead><tr><th>Pedido</th><th>Ofrecido</th></tr></thead><tbody>');
    for (const line of equivalents) {
      out.push(
        `<tr><td><strong>#${line.requisitionLineNo}</strong> ${esc(line.requestedDescription)}</td>` +
          `<td>${esc(line.offeredDescription)}</td></tr>`,
      );
    }
    out.push('</tbody></table></div>');
  }

  const ambiguous = data.lines.filter((l) => l.status === 'ambiguous');
  if (ambiguous.length > 0) {
    out.push(`<h3>Dudosos (${ambiguous.length})</h3>`);
    out.push('<p class="note">El sistema no pudo determinar a que item corresponden. Decide el comprador.</p>');
    out.push(
      '<div class="scroll"><table><thead><tr><th class="num">Linea</th><th>Ofrecido</th>' +
        '<th>Mejor hipotesis</th><th class="num">Confianza</th></tr></thead><tbody>',
    );
    for (const line of ambiguous) {
      out.push(
        `<tr><td class="num">${line.offerLineNo}</td><td>${esc(line.offeredDescription)}</td>` +
          `<td>${line.requisitionLineNo ? `<strong>#${line.requisitionLineNo}</strong> ${esc(line.requestedDescription)}` : '&mdash;'}</td>` +
          `<td class="num">${line.confidence.toFixed(2)}</td></tr>`,
      );
    }
    out.push('</tbody></table></div>');
  }

  return out.join('\n');
}

function renderTraceabilityHtml(data: ReportData): string {
  const meta = data.offer.extractionMeta;
  const m = data.summary.metrics;
  const out: string[] = ['<h2>Trazabilidad</h2>'];

  out.push('<h3>Extraccion</h3>');
  if (meta) {
    out.push(`<div class="meta"><dl>
      <dt>Estrategia</dt><dd>${esc(meta.strategy)}</dd>
      <dt>Modelo</dt><dd>${esc(meta.modelUsed ?? 'ninguno (deterministico)')}</dd>
      <dt>Llamadas al LLM</dt><dd>${meta.llmCalls} en ${meta.batches} lotes</dd>
      <dt>Tokens</dt><dd>${meta.inputTokens} entrada / ${meta.outputTokens} salida</dd>
      <dt>Duracion</dt><dd>${Math.round(meta.durationMs)} ms</dd>
      <dt>SHA-256</dt><dd><code>${esc(meta.sourceHash.slice(0, 24))}...</code></dd>
    </dl></div>`);

    if (meta.warnings.length > 0) {
      out.push(`<details><summary>Avisos de extraccion (${meta.warnings.length})</summary><ul>`);
      for (const w of meta.warnings.slice(0, 50)) {
        out.push(`<li><code>${esc(w.code)}</code> ${esc(w.message)}</li>`);
      }
      out.push('</ul></details>');
    } else {
      out.push('<p class="note">Sin avisos de extraccion.</p>');
    }
  }

  out.push('<h3>Conciliacion</h3>');
  out.push(`<div class="meta"><dl>
    <dt>Estrategia</dt><dd><code>${esc(data.strategyVersion)}</code></dd>
    <dt>Modelo</dt><dd>${esc(data.modelUsed ?? 'ninguno (matcher lexico local)')}</dd>
    <dt>Por alias</dt><dd>${m.resolvedByAlias}</dd>
    <dt>Por LLM</dt><dd>${m.resolvedByLlm}</dd>
    <dt>Por similitud lexica</dt><dd>${m.resolvedByLexical}</dd>
    <dt>Conflictos</dt><dd>${m.conflicts}</dd>
    <dt>Tokens</dt><dd>${m.inputTokens} entrada / ${m.outputTokens} salida</dd>
  </dl></div>`);

  out.push('<h3>Volumen</h3>');
  out.push(`<p>
    Conciliar ${m.offerLines} lineas contra ${m.requisitionItems} items por fuerza bruta serian
    <strong>${m.bruteForceComparisons.toLocaleString('es-AR')} comparaciones</strong>.
    Con el prefiltro vectorial fueron <strong>${m.prefilterQueries} query indexada</strong>
    (HNSW + coseno, dentro de Postgres) en ${Math.round(m.prefilterMs)} ms, y el decisor
    evaluo 5 candidatos por linea en vez de ${m.requisitionItems}.
  </p>`);

  const nonTrivial = data.lines.filter(
    (l) => l.needsReview && l.candidates.length > 0 && l.status !== 'missing_from_offer',
  );

  if (nonTrivial.length > 0) {
    out.push(`<h3>Candidatos evaluados (${nonTrivial.length} decisiones no triviales)</h3>`);
    for (const line of nonTrivial.slice(0, 60)) {
      out.push(`<details><summary>L${line.offerLineNo} &mdash; ${esc(line.offeredDescription)} &rarr; ${esc(
        STATUS_LABEL[line.status],
      )} (${esc(DECIDED_BY_LABEL[line.decidedBy] ?? line.decidedBy)}, confianza ${line.confidence.toFixed(
        2,
      )})</summary><ul>`);
      for (const c of line.candidates) {
        const chosen = c.lineNo === line.requisitionLineNo;
        out.push(
          `<li${chosen ? ' class="chosen"' : ''}><code>${c.score.toFixed(3)}</code> ` +
            `#${c.lineNo} ${esc(c.description)}${chosen ? ' &larr; elegido' : ''}</li>`,
        );
      }
      out.push('</ul></details>');
    }
  }

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
