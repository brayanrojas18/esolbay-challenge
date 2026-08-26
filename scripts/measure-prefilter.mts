/**
 * Mide el recall del prefiltro vectorial contra la guia del escenario.
 *
 * HERRAMIENTA DE VALIDACION, NO PARTE DE LA APLICACION. Lee la guia, que el
 * enunciado permite usar para "validar los datos" pero prohibe como input
 * automatico del sistema. Por eso vive en scripts/ y toma el fixture de tests/.
 *
 *   npx tsx scripts/measure-prefilter.mts <offerId> <case-simple|case-complex> <archivo.pdf>
 *
 * La metrica que importa es el recall@5: si el item correcto NO entra en los 5
 * candidatos, el LLM no tiene forma de elegirlo. Es el techo de calidad de toda
 * la conciliacion.
 */
import { resolve } from 'node:path';
import { closeDb, sqlConnection } from '../src/db/client.js';
import { findCandidatesForOffer, bruteForceComparisons } from '../src/reconcile/candidates.js';
import { readGuideFor, expectedMatches } from '../tests/fixtures/reconciliation-guide.js';

const [offerId, scenario, offerFile] = process.argv.slice(2);

if (!offerId || !scenario || !offerFile) {
  console.error(
    'uso: npx tsx scripts/measure-prefilter.mts <offerId> <case-simple|case-complex> <archivo>',
  );
  process.exit(1);
}

const sql = sqlConnection();

const offer = await sql<{ requisition_id: string; source_filename: string }[]>`
  SELECT requisition_id, source_filename FROM offers WHERE id = ${offerId}
`;
if (!offer[0]) {
  console.error('no existe esa oferta');
  await closeDb();
  process.exit(1);
}

const section = await readGuideFor(resolve('challenge', scenario), offerFile);
const expected = expectedMatches(section);

const lines = await sql<{ line_no: number; offered_description: string; embedding: string }[]>`
  SELECT line_no, offered_description, embedding::text AS embedding
  FROM offer_items
  WHERE offer_id = ${offerId} AND embedding IS NOT NULL
  ORDER BY line_no
`;

const requisitionSize = await sql<{ count: number }[]>`
  SELECT count(*)::int AS count FROM requisition_items WHERE requisition_id = ${offer[0].requisition_id}
`;

let evaluadas = 0;
let top1 = 0;
let top5 = 0;
let queries = 0;
const perdidas: { line: number; description: string; expected: number; got: string }[] = [];

const started = performance.now();

// Una sola query resuelve el top-5 de las 177 lineas.
const candidatesByLine = await findCandidatesForOffer(offerId, offer[0].requisition_id, 5);
queries = 1;

const prefilterMs = performance.now() - started;

for (const line of lines) {
  const target = expected.get(line.line_no);
  // Las lineas sin contraparte en la guia (extras, y las 8 que la guia omite)
  // no se pueden evaluar: no hay respuesta correcta contra la cual medir.
  if (target === undefined) continue;

  evaluadas++;
  const candidates = candidatesByLine.get(line.line_no) ?? [];

  const position = candidates.findIndex((c) => c.lineNo === target);
  if (position === 0) top1++;
  if (position >= 0) top5++;
  else {
    perdidas.push({
      line: line.line_no,
      description: line.offered_description,
      expected: target,
      got: candidates[0] ? `#${candidates[0].lineNo} ${candidates[0].description}` : '(nada)',
    });
  }
}

const elapsed = prefilterMs;
const items = requisitionSize[0]?.count ?? 0;

const pct = (n: number) => `${((n / evaluadas) * 100).toFixed(1)}%`;

console.log(`\n=== Prefiltro vectorial: ${offer[0].source_filename} ===\n`);
console.log(`Items solicitados en la requisicion : ${items}`);
console.log(`Lineas de la oferta                 : ${lines.length}`);
console.log(`Lineas evaluables contra la guia    : ${evaluadas}`);
console.log('');
console.log(`recall@1 : ${top1}/${evaluadas}  (${pct(top1)})`);
console.log(`recall@5 : ${top5}/${evaluadas}  (${pct(top5)})   <- techo de calidad del matcher`);
console.log('');
console.log(`Queries indexadas emitidas : ${queries}`);
console.log(`Comparaciones por fuerza bruta que se evitaron : ${bruteForceComparisons(lines.length, items).toLocaleString('es-AR')}`);
console.log(`Tiempo total del prefiltro : ${Math.round(elapsed)} ms en ${queries} query`);

if (perdidas.length > 0) {
  console.log(`\nLineas cuyo item correcto NO entro al top-5 (${perdidas.length}):`);
  for (const p of perdidas) {
    console.log(`  L${p.line} "${p.description}"`);
    console.log(`      esperado: #${p.expected}   |   top1 obtenido: ${p.got}`);
  }
}

await closeDb();
