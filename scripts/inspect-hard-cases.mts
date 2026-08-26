/**
 * Los casos dificiles: lineas donde el proveedor usa un vocabulario que no
 * comparte NINGUNA palabra con la requisicion. Es donde un baseline lexico
 * tiene que fallar y un embedding semantico tiene que acertar.
 *
 *   npx tsx scripts/inspect-hard-cases.mts <offerId>
 */
import { closeDb, sqlConnection } from '../src/db/client.js';
import { findCandidates } from '../src/reconcile/candidates.js';

const offerId = process.argv[2];
if (!offerId) {
  console.error('uso: npx tsx scripts/inspect-hard-cases.mts <offerId>');
  process.exit(1);
}

/** Lineas de la oferta cuya descripcion no comparte sustantivo con el pedido. */
const HARD_LINES = [12, 13, 14, 15, 16, 22, 24, 25, 28, 30, 32, 33, 35, 37, 42, 43, 44, 51, 99];

const sql = sqlConnection();
const offer = await sql<{ requisition_id: string }[]>`
  SELECT requisition_id FROM offers WHERE id = ${offerId}
`;
if (!offer[0]) {
  console.error('no existe esa oferta');
  await closeDb();
  process.exit(1);
}

const lines = await sql<
  { line_no: number; offered_description: string; embedding: string }[]
>`
  SELECT line_no, offered_description, embedding::text AS embedding
  FROM offer_items
  WHERE offer_id = ${offerId} AND line_no = ANY(${HARD_LINES}::int[]) AND embedding IS NOT NULL
  ORDER BY line_no
`;

let aciertos = 0;
let enTop5 = 0;

for (const line of lines) {
  const vector = JSON.parse(line.embedding) as number[];
  const candidates = await findCandidates(offer[0].requisition_id, vector, 5);
  const top = candidates[0];
  const acerto = top?.lineNo === line.line_no;
  const posicion = candidates.findIndex((c) => c.lineNo === line.line_no);

  if (acerto) aciertos++;
  if (posicion >= 0) enTop5++;

  const marca = acerto ? 'OK  ' : posicion >= 0 ? `top${posicion + 1}` : 'FALLA';
  console.log(
    `${marca} L${String(line.line_no).padStart(3)} "${line.offered_description}"\n` +
      `        top1: ${top?.score.toFixed(3)} #${top?.lineNo} ${top?.description}`,
  );
}

console.log(
  `\nTop-1 correcto: ${aciertos}/${lines.length}  |  ` +
    `el correcto aparece en el top-5: ${enTop5}/${lines.length}`,
);
console.log(
  'Lo segundo es lo que realmente importa: si el item correcto entra al top-5,\n' +
    'el LLM todavia puede elegirlo. Si no entra, el prefiltro lo perdio para siempre.',
);

await closeDb();
