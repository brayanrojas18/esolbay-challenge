/**
 * Corre el pipeline completo sobre los cuatro archivos de oferta del challenge
 * y deja los reportes en out/.
 *
 *   npx tsx scripts/run-all.mts [--dry-run]
 *
 * Es lo que conviene ejecutar para ver el entregable entero de una sola vez.
 */
import { resolve } from 'node:path';
import { hasAiCredentials, providerLabel } from '../src/core/config.js';
import { log, stage } from '../src/core/logger.js';
import { closeDb, sqlConnection } from '../src/db/client.js';
import { migrate } from '../src/db/migrate.js';
import { extractOffer } from '../src/extract/index.js';
import { seedScenario } from '../src/ingest/csv-seed.js';
import { ensureRequisitionEmbeddings, persistOffer } from '../src/ingest/persist-offer.js';
import { reconcileOffer } from '../src/reconcile/matcher.js';
import { persistReconciliation } from '../src/reconcile/persist.js';
import { loadReportData } from '../src/report/data.js';
import { renderHtml } from '../src/report/html.js';
import { renderJson } from '../src/report/json.js';
import { renderMarkdown } from '../src/report/markdown.js';
import { mkdir, writeFile } from 'node:fs/promises';

const dryRun = process.argv.includes('--dry-run') || !hasAiCredentials();

const SCENARIOS = [
  {
    dir: 'case-simple',
    requisition: 'REQ-OFI-2026-001',
    offers: ['oferta_oficenter_norte.xlsx', 'oferta_comercial_oficinas.pdf'],
  },
  {
    dir: 'case-complex',
    requisition: 'REQ-MOP-2026-001',
    offers: ['oferta_suministros_industriales.xlsx', 'oferta_mantenimiento_integral.pdf'],
  },
] as const;

const outDir = resolve(process.cwd(), 'out');
await mkdir(outDir, { recursive: true });

log.info(dryRun ? 'modo dry-run: sin llamadas a la API' : `modo completo con ${providerLabel()}`);

await stage('migrar', async () => {
  await migrate();
});

const resumen: {
  proveedor: string;
  archivo: string;
  lineas: number;
  cobertura: string;
  aRevisar: number;
  total: string;
}[] = [];

for (const scenario of SCENARIOS) {
  const scenarioDir = resolve(process.cwd(), 'challenge', scenario.dir);

  await stage(`seed ${scenario.dir}`, async (report) => {
    const result = await seedScenario(scenarioDir);
    report({ items: result.itemsInserted });
  });

  await stage(`embeddings ${scenario.requisition}`, async (report) => {
    const result = await ensureRequisitionEmbeddings(scenario.requisition, { dryRun });
    report({ generados: result.generated, total: result.total });
  });

  for (const offerFile of scenario.offers) {
    await stage(`procesar ${offerFile}`, async (report) => {
      const offer = await extractOffer(resolve(scenarioDir, 'offers', offerFile), { dryRun });
      const persisted = await persistOffer(offer, scenario.requisition, { dryRun });

      const sql = sqlConnection();
      const [row] = await sql<{ requisition_id: string }[]>`
        SELECT requisition_id FROM offers WHERE id = ${persisted.offerId}
      `;

      const outcome = await reconcileOffer({
        offerId: persisted.offerId,
        requisitionId: row!.requisition_id,
        providerId: persisted.providerId,
        dryRun,
      });

      const { reconciliationId, summary } = await persistReconciliation(
        persisted.offerId,
        row!.requisition_id,
        outcome,
      );

      const data = await loadReportData(reconciliationId);
      const slug = `${data.requisitionCode}_${offerFile.replace(/\.[^.]+$/, '')}`
        .replace(/[^a-zA-Z0-9_.-]/g, '_')
        .toLowerCase();

      await writeFile(resolve(outDir, `${slug}.md`), renderMarkdown(data), 'utf8');
      await writeFile(resolve(outDir, `${slug}.json`), renderJson(data), 'utf8');
      await writeFile(resolve(outDir, `${slug}.html`), renderHtml(data), 'utf8');

      resumen.push({
        proveedor: data.offer.providerName,
        archivo: offerFile,
        lineas: data.offerItems.length,
        cobertura: `${summary.covered}/${summary.requisitionItems} (${summary.coveragePct}%)`,
        aRevisar: summary.needsReview,
        total: summary.comparableTotal.toLocaleString('es-AR'),
      });

      report({ lineas: data.offerItems.length, aRevisar: summary.needsReview });
    });
  }
}

console.log('\n=== Resultado ===\n');
console.table(resumen);
console.log(`\nReportes en ${outDir}`);

await closeDb();
