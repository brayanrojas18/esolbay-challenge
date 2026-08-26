/**
 * Compara una conciliacion persistida contra la guia del escenario.
 *
 * HERRAMIENTA DE VALIDACION, NO PARTE DE LA APLICACION.
 *
 *   npx tsx scripts/measure-reconciliation.mts <reconciliationId> <case-x> <archivo>
 */
import { resolve } from 'node:path';
import { closeDb, sqlConnection } from '../src/db/client.js';
import { readGuideFor, type GuideRelation } from '../tests/fixtures/reconciliation-guide.js';

const [reconciliationId, scenario, offerFile] = process.argv.slice(2);
if (!reconciliationId || !scenario || !offerFile) {
  console.error('uso: npx tsx scripts/measure-reconciliation.mts <reconciliationId> <case-x> <archivo>');
  process.exit(1);
}

const sql = sqlConnection();

const rows = await sql<
  {
    status: string;
    confidence: string;
    offer_line_no: number | null;
    requisition_line_no: number | null;
    offered_description: string | null;
    requested_description: string | null;
    reasoning: string;
    decided_by: string;
  }[]
>`
  SELECT rl.status, rl.confidence, rl.reasoning, rl.decided_by,
         oi.line_no AS offer_line_no, ri.line_no AS requisition_line_no,
         oi.offered_description, ri.raw_description AS requested_description
  FROM reconciliation_lines rl
  LEFT JOIN offer_items oi ON oi.id = rl.offer_item_id
  LEFT JOIN requisition_items ri ON ri.id = rl.requisition_item_id
  WHERE rl.reconciliation_id = ${reconciliationId}
  ORDER BY oi.line_no NULLS LAST, ri.line_no
`;

const section = await readGuideFor(resolve('challenge', scenario), offerFile);

/** Mapeo de los estados propios al vocabulario de la guia. */
function toGuideRelation(status: string): GuideRelation | 'alternative' | 'ambiguous' {
  return status as GuideRelation | 'alternative' | 'ambiguous';
}

// Esperado segun la guia, indexado por linea de oferta.
const expectedByOffer = new Map<number, { req: number | null; relation: GuideRelation }>();
const expectedMissing = new Set<number>();
for (const r of section.rows) {
  if (r.offerLineNo !== null) {
    expectedByOffer.set(r.offerLineNo, { req: r.requisitionLineNo, relation: r.relation });
  } else if (r.requisitionLineNo !== null && r.relation === 'missing_from_offer') {
    expectedMissing.add(r.requisitionLineNo);
  }
}

let evaluadas = 0;
let itemCorrecto = 0;
let estadoCorrecto = 0;
const errores: string[] = [];

for (const row of rows) {
  if (row.offer_line_no === null) continue;
  const expected = expectedByOffer.get(row.offer_line_no);
  if (!expected) continue; // linea que la guia no documenta

  evaluadas++;
  const gotItem = row.requisition_line_no;
  const okItem = gotItem === expected.req;
  const okStatus = toGuideRelation(row.status) === expected.relation;

  if (okItem) itemCorrecto++;
  if (okItem && okStatus) estadoCorrecto++;

  if (!okItem) {
    errores.push(
      `L${row.offer_line_no} "${row.offered_description}"\n` +
        `    esperado item #${expected.req} (${expected.relation})\n` +
        `    obtenido item ${gotItem === null ? 'NINGUNO' : '#' + gotItem}` +
        ` (${row.status}, conf ${row.confidence}) -> ${row.reasoning.slice(0, 110)}`,
    );
  } else if (!okStatus) {
    errores.push(
      `L${row.offer_line_no} "${row.offered_description}" item OK #${gotItem}\n` +
        `    esperado estado ${expected.relation}, obtenido ${row.status}`,
    );
  }
}

// Faltantes.
const gotMissing = new Set(
  rows.filter((r) => r.status === 'missing_from_offer' && r.requisition_line_no !== null)
    .map((r) => r.requisition_line_no!),
);
const missingOk = [...expectedMissing].filter((n) => gotMissing.has(n)).length;
const missingExtra = [...gotMissing].filter((n) => !expectedMissing.has(n));

const pct = (n: number, d: number) => (d === 0 ? '-' : `${((n / d) * 100).toFixed(1)}%`);

console.log(`\n=== Conciliacion vs guia: ${offerFile} ===\n`);
console.log(`Lineas de oferta documentadas por la guia : ${expectedByOffer.size}`);
console.log(`Lineas evaluadas                          : ${evaluadas}`);
console.log('');
console.log(`Item correcto  : ${itemCorrecto}/${evaluadas}  (${pct(itemCorrecto, evaluadas)})`);
console.log(`Item + estado  : ${estadoCorrecto}/${evaluadas}  (${pct(estadoCorrecto, evaluadas)})`);
console.log('');
console.log(`Faltantes esperados por la guia : ${expectedMissing.size}`);
console.log(`Faltantes detectados correctos  : ${missingOk}`);
console.log(`Faltantes de mas (falsos)       : ${missingExtra.length}${missingExtra.length ? ' -> #' + missingExtra.slice(0, 20).join(', #') : ''}`);

if (errores.length > 0) {
  console.log(`\n--- Discrepancias (${errores.length}) ---`);
  for (const e of errores.slice(0, 40)) console.log(e);
  if (errores.length > 40) console.log(`... y ${errores.length - 40} mas`);
}

await closeDb();
