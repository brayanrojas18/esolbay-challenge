/**
 * Inspeccion manual del prefiltro vectorial.
 *
 *   npx tsx scripts/inspect-candidates.mts <offerId> [cantidadDeLineas]
 *
 * Imprime, para unas cuantas lineas ofertadas, los top-5 items solicitados que
 * devuelve pgvector con su score. Sirve para el criterio de corte de la fase de
 * embeddings: mirar diez casos a mano antes de dejar que decida el LLM.
 */
import { closeDb, sqlConnection } from '../src/db/client.js';
import { findCandidates } from '../src/reconcile/candidates.js';

const offerId = process.argv[2];
const sampleSize = Number(process.argv[3] ?? 12);

if (!offerId) {
  console.error('uso: npx tsx scripts/inspect-candidates.mts <offerId> [cantidad]');
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

const lines = await sql<
  { line_no: number; supplier_code: string | null; offered_description: string; embedding: string }[]
>`
  SELECT line_no, supplier_code, offered_description, embedding::text AS embedding
  FROM offer_items
  WHERE offer_id = ${offerId} AND embedding IS NOT NULL
  ORDER BY line_no
`;

// Muestreo parejo a lo largo de toda la oferta, no solo las primeras lineas:
// el final es donde estan los extras y los casos raros.
const step = Math.max(1, Math.floor(lines.length / sampleSize));
const sample = lines.filter((_, i) => i % step === 0).slice(0, sampleSize);

console.log(`\nOferta ${offer[0].source_filename} - ${lines.length} lineas\n`);

let top1Count = 0;

for (const line of sample) {
  const vector = JSON.parse(line.embedding) as number[];
  const candidates = await findCandidates(offer[0].requisition_id, vector, 5);

  console.log(`[linea ${line.line_no}] ${line.supplier_code ?? ''} ${line.offered_description}`);
  candidates.forEach((c, i) => {
    const marker = i === 0 ? '->' : '  ';
    console.log(`   ${marker} ${c.score.toFixed(3)}  #${c.lineNo} ${c.description}`);
  });
  console.log();

  if (candidates[0] && candidates[0].lineNo === line.line_no) top1Count++;
}

console.log(
  `Coincidencia por numero de linea en el top-1: ${top1Count}/${sample.length} ` +
    `(solo orientativo: la numeracion no tiene por que coincidir)`,
);

await closeDb();
