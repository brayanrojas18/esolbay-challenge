import { resolve } from 'node:path';
import { hasAiCredentials, providerLabel } from '../core/config.js';
import { errorMessage } from '../core/errors.js';
import { log, stage } from '../core/logger.js';
import { closeDb } from '../db/client.js';
import { extractOffer } from '../extract/index.js';
import { ensureRequisitionEmbeddings, persistOffer } from '../ingest/persist-offer.js';
import { parseArgs, requireFlag } from './args.js';

const USAGE =
  'npm run process -- --file challenge/case-complex/offers/oferta_mantenimiento_integral.pdf --requisition REQ-MOP-2026-001 [--dry-run]';

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const filePath = resolve(process.cwd(), requireFlag(args, 'file', USAGE));
  const requisitionCode = requireFlag(args, 'requisition', USAGE);

  // Sin API key el dry-run no es opcional: es el unico camino posible.
  const dryRun = args.booleans.has('dry-run') || !hasAiCredentials();
  if (dryRun) {
    log.warn(
      args.booleans.has('dry-run')
        ? 'modo --dry-run: sin llamadas a la API'
        : 'sin credenciales de IA: se usa el camino deterministico local (equivale a --dry-run)',
    );
  } else {
    log.info(`proveedor de IA: ${providerLabel()}`);
  }

  const offer = await stage('extraer', async (report) => {
    const result = await extractOffer(filePath, { dryRun });
    report({
      lineas: result.items.length,
      warnings: result.meta.warnings.length,
      llamadasLlm: result.meta.llmCalls,
      tokensEntrada: result.meta.inputTokens,
      tokensSalida: result.meta.outputTokens,
    });
    return result;
  });

  log.info(`  proveedor: ${offer.header.providerName}`);
  log.info(`  cotizacion: ${offer.header.quoteCode ?? '(sin codigo)'} del ${offer.header.quoteDate ?? '(sin fecha)'}`);

  for (const warning of offer.meta.warnings.slice(0, 10)) {
    log.warn(`  [${warning.code}] ${warning.message}`);
  }
  if (offer.meta.warnings.length > 10) {
    log.warn(`  ... y ${offer.meta.warnings.length - 10} warnings mas (quedan en la trazabilidad)`);
  }

  await stage('embeddings de la requisicion', async (report) => {
    const result = await ensureRequisitionEmbeddings(requisitionCode, { dryRun });
    report({ generados: result.generated, total: result.total });
    log.info(`  proveedor de embeddings: ${result.provider} (${result.model})`);
  });

  const persisted = await stage('persistir', async (report) => {
    const result = await persistOffer(offer, requisitionCode, { dryRun });
    report({
      lineas: result.itemCount,
      embeddingsDesdeCache: result.embeddingCacheHits,
      llamadasEmbedding: result.embeddingCalls,
    });
    return result;
  });

  process.stdout.write(`\n${persisted.offerId}\n`);
  log.info('listo. Para conciliar:');
  log.info(`  npm run reconcile -- --offer ${persisted.offerId}${dryRun ? ' --dry-run' : ''}`);
}

main()
  .then(() => closeDb())
  .then(() => process.exit(0))
  .catch(async (e: unknown) => {
    log.error(errorMessage(e));
    await closeDb();
    process.exit(1);
  });
