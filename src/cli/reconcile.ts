import { hasAiCredentials, providerLabel } from '../core/config.js';
import { errorMessage, MatchingError } from '../core/errors.js';
import { log, stage } from '../core/logger.js';
import { closeDb, sqlConnection } from '../db/client.js';
import { reconcileOffer } from '../reconcile/matcher.js';
import { persistReconciliation } from '../reconcile/persist.js';
import { parseArgs, requireFlag } from './args.js';

const USAGE = 'npm run reconcile -- --offer <offerId> [--dry-run] [--top-k 5]';

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const offerId = requireFlag(args, 'offer', USAGE);
  const topK = Number(args.flags.get('top-k') ?? 5);

  const dryRun = args.booleans.has('dry-run') || !hasAiCredentials();
  if (dryRun) {
    log.warn('la decision se toma con el matcher lexico local, sin LLM');
  } else {
    log.info(`proveedor de IA: ${providerLabel()}`);
  }

  const sql = sqlConnection();
  const [offer] = await sql<
    { requisition_id: string; provider_id: string; source_filename: string }[]
  >`
    SELECT requisition_id, provider_id, source_filename FROM offers WHERE id = ${offerId}
  `;

  if (!offer) {
    throw new MatchingError('no existe esa oferta. Corre "npm run process" primero', { offerId });
  }

  log.info(`conciliando ${offer.source_filename}`);

  const outcome = await stage('conciliar', async (report) => {
    const result = await reconcileOffer({
      offerId,
      requisitionId: offer.requisition_id,
      providerId: offer.provider_id,
      dryRun,
      topK,
    });
    report({
      lineas: result.lines.length,
      porAlias: result.metrics.resolvedByAlias,
      porLlm: result.metrics.resolvedByLlm,
      porLexico: result.metrics.resolvedByLexical,
      conflictos: result.metrics.conflicts,
      llamadasLlm: result.metrics.llmCalls,
    });
    return result;
  });

  const { reconciliationId, summary } = await stage('persistir conciliacion', async (report) => {
    const result = await persistReconciliation(offerId, offer.requisition_id, outcome);
    report({ lineas: outcome.lines.length });
    return result;
  });

  log.info('');
  log.info(`cobertura: ${summary.covered} de ${summary.requisitionItems} items (${summary.coveragePct}%)`);
  for (const [status, count] of Object.entries(summary.byStatus).sort((a, b) => b[1] - a[1])) {
    log.info(`  ${status.padEnd(20)} ${count}`);
  }
  log.info(`requieren revision: ${summary.needsReview}`);
  log.info(`total cotizado: $${summary.quotedTotal.toLocaleString('es-AR')}`);
  log.info(`total comparable (sin extras): $${summary.comparableTotal.toLocaleString('es-AR')}`);

  process.stdout.write(`\n${reconciliationId}\n`);
  log.info('para ver el reporte:');
  log.info(`  npm run report -- --reconciliation ${reconciliationId}`);
}

main()
  .then(() => closeDb())
  .then(() => process.exit(0))
  .catch(async (e: unknown) => {
    log.error(errorMessage(e));
    await closeDb();
    process.exit(1);
  });
