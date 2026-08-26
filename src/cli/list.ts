import { errorMessage } from '../core/errors.js';
import { log } from '../core/logger.js';
import { closeDb, sqlConnection } from '../db/client.js';

/**
 * Lista lo que hay cargado, con los IDs a mano.
 *
 *   npm run list
 *
 * Evita tener que copiar UUIDs de la salida de otro comando o ir a buscarlos
 * a la base.
 */
async function main(): Promise<void> {
  const sql = sqlConnection();

  const [tablas] = await sql<{ existe: boolean }[]>`
    SELECT to_regclass('public.requisitions') IS NOT NULL AS existe
  `;

  if (!tablas?.existe) {
    log.warn('la base todavia no tiene tablas');
    log.info('corre "npm run seed" para crearlas y cargar los CSV');
    return;
  }

  const requisitions = await sql<{ code: string; title: string; items: number }[]>`
    SELECT r.code, r.title, count(ri.id)::int AS items
    FROM requisitions r
    LEFT JOIN requisition_items ri ON ri.requisition_id = r.id
    GROUP BY r.code, r.title
    ORDER BY r.code
  `;

  if (requisitions.length === 0) {
    log.warn('la base esta vacia. Corre "npm run seed"');
    return;
  }

  console.log('\nSOLICITUDES\n');
  console.table(requisitions);

  const offers = await sql<
    {
      id: string;
      archivo: string;
      proveedor: string;
      lineas: number;
      estado: string;
    }[]
  >`
    SELECT o.id, o.source_filename AS archivo, p.name AS proveedor,
           count(oi.id)::int AS lineas, o.status AS estado
    FROM offers o
    JOIN providers p ON p.id = o.provider_id
    LEFT JOIN offer_items oi ON oi.offer_id = o.id
    GROUP BY o.id, o.source_filename, p.name, o.status, o.created_at
    ORDER BY o.created_at
  `;

  if (offers.length === 0) {
    console.log('\nSin ofertas procesadas todavia.');
    console.log('  npm run process -- --file <archivo> --requisition <codigo>\n');
    return;
  }

  console.log('\nOFERTAS PROCESADAS\n');
  console.table(offers);

  const reconciliations = await sql<
    { id: string; oferta: string; cobertura: string; a_revisar: number }[]
  >`
    SELECT rc.id, o.source_filename AS oferta,
           (rc.summary->>'covered') || '/' || (rc.summary->>'requisitionItems') AS cobertura,
           (rc.summary->>'needsReview')::int AS a_revisar
    FROM reconciliations rc
    JOIN offers o ON o.id = rc.offer_id
    ORDER BY rc.created_at
  `;

  if (reconciliations.length === 0) {
    console.log('\nSin conciliaciones todavia.');
    console.log('  npm run reconcile -- --offer <id de la tabla de arriba>\n');
    return;
  }

  console.log('\nCONCILIACIONES\n');
  console.table(reconciliations);
  console.log('  npm run report -- --reconciliation <id>\n');
}

main()
  .then(() => closeDb())
  .then(() => process.exit(0))
  .catch(async (e: unknown) => {
    log.error(errorMessage(e));
    await closeDb();
    process.exit(1);
  });
