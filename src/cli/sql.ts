import { ConfigError, errorMessage } from '../core/errors.js';
import { log } from '../core/logger.js';
import { closeDb, sqlConnection } from '../db/client.js';

/**
 * Corre una consulta contra la base y la imprime como tabla.
 *
 *   npm run sql -- "select code, title from requisitions"
 *
 * Es para inspeccionar el estado sin salir de la terminal ni abrir un cliente.
 */
const EJEMPLOS = [
  'select code, title from requisitions',
  'select line_no, supplier_code, offered_description, offered_quantity, unit_price from offer_items order by line_no limit 20',
  'select status, count(*) from reconciliation_lines group by status order by 2 desc',
];

async function main(): Promise<void> {
  const query = process.argv.slice(2).join(' ').trim();

  if (!query) {
    throw new ConfigError('falta la consulta', {
      uso: 'npm run sql -- "select ..."',
      ejemplos: EJEMPLOS.join(' | '),
    });
  }

  const rows = await sqlConnection().unsafe(query);

  if (rows.length === 0) {
    log.info('sin resultados');
    return;
  }

  // Los vectores de 1536 numeros hacen ilegible cualquier salida.
  const limpias = rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      out[k] = typeof v === 'string' && v.length > 60 ? v.slice(0, 57) + '...' : v;
    }
    return out;
  });

  console.table(limpias);
  log.info(`${rows.length} fila(s)`);
}

main()
  .then(() => closeDb())
  .then(() => process.exit(0))
  .catch(async (e: unknown) => {
    log.error(errorMessage(e));
    await closeDb();
    process.exit(1);
  });
