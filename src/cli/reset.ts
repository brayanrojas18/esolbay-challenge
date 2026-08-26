import { errorMessage } from '../core/errors.js';
import { log } from '../core/logger.js';
import { closeDb, sqlConnection } from '../db/client.js';
import { parseArgs } from './args.js';

/**
 * Deja la base vacia.
 *
 *   npm run db:reset            borra los datos, mantiene las tablas
 *   npm run db:reset -- --hard  borra tambien las tablas y las migraciones
 */
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const sql = sqlConnection();

  if (args.booleans.has('hard')) {
    await sql`
      DROP TABLE IF EXISTS
        supplier_item_aliases, reconciliation_lines, reconciliations,
        offer_items, offers, requisition_items, requisition_groups,
        items, requisitions, providers, _migrations
      CASCADE
    `;
    log.info('tablas eliminadas. Corre "npm run seed" para recrearlas');
    return;
  }

  // TRUNCATE con CASCADE respeta el orden de las foreign keys solo.
  await sql`
    TRUNCATE
      supplier_item_aliases, reconciliation_lines, reconciliations,
      offer_items, offers, requisition_items, requisition_groups,
      items, requisitions, providers
    RESTART IDENTITY CASCADE
  `;

  log.info('base vacia. Corre "npm run seed" para volver a cargar los CSV');
}

main()
  .then(() => closeDb())
  .then(() => process.exit(0))
  .catch(async (e: unknown) => {
    log.error(errorMessage(e));
    await closeDb();
    process.exit(1);
  });
