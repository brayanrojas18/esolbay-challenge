import { resolve } from 'node:path';
import { errorMessage } from '../core/errors.js';
import { log, stage } from '../core/logger.js';
import { closeDb } from '../db/client.js';
import { migrate } from '../db/migrate.js';
import { seedScenario } from '../ingest/csv-seed.js';
import { parseArgs } from './args.js';

/**
 * npm run seed                       -> carga los dos escenarios
 * npm run seed -- --scenario simple  -> carga solo case-simple
 * npm run seed -- --no-migrate       -> asume que la base ya esta migrada
 */

const SCENARIOS: Record<string, string> = {
  simple: 'case-simple',
  complex: 'case-complex',
};

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const root = resolve(process.cwd(), 'challenge');

  const requested = args.flags.get('scenario');
  const dirs = requested
    ? [SCENARIOS[requested] ?? requested]
    : Object.values(SCENARIOS);

  if (!args.booleans.has('no-migrate')) {
    await stage('migrar', async () => {
      await migrate();
    });
  }

  for (const dir of dirs) {
    await stage(`seed ${dir}`, async (report) => {
      const result = await seedScenario(resolve(root, dir));
      report({
        itemsCatalogo: result.catalogItems,
        itemsSolicitados: result.itemsInserted,
      });
      log.info(`  ${result.requisitionCode}: ${result.itemsInserted} items solicitados`);
    });
  }
}

main()
  .then(() => closeDb())
  .then(() => process.exit(0))
  .catch(async (e: unknown) => {
    log.error(errorMessage(e));
    await closeDb();
    process.exit(1);
  });
