import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ConfigError, errorMessage } from '../core/errors.js';
import { log, stage } from '../core/logger.js';
import { closeDb } from '../db/client.js';
import { loadReportData } from '../report/data.js';
import { renderHtml } from '../report/html.js';
import { renderJson } from '../report/json.js';
import { renderMarkdown } from '../report/markdown.js';
import { parseArgs, requireFlag } from './args.js';

const USAGE = 'npm run report -- --reconciliation <id> [--format md|json|html|all] [--out out/]';

const RENDERERS = {
  md: { render: renderMarkdown, ext: 'md' },
  json: { render: renderJson, ext: 'json' },
  html: { render: renderHtml, ext: 'html' },
} as const;

type Format = keyof typeof RENDERERS;

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const reconciliationId = requireFlag(args, 'reconciliation', USAGE);
  const requested = args.flags.get('format') ?? 'all';
  const outDir = resolve(process.cwd(), args.flags.get('out') ?? 'out');

  const formats: Format[] =
    requested === 'all' ? (Object.keys(RENDERERS) as Format[]) : [asFormat(requested)];

  const data = await stage('cargar', async (report) => {
    const result = await loadReportData(reconciliationId);
    report({ lineas: result.lines.length, itemsOferta: result.offerItems.length });
    return result;
  });

  await mkdir(outDir, { recursive: true });

  const slug = `${data.requisitionCode}_${data.offer.sourceFilename.replace(/\.[^.]+$/, '')}`
    .replace(/[^a-zA-Z0-9_.-]/g, '_')
    .toLowerCase();

  for (const format of formats) {
    const { render, ext } = RENDERERS[format];
    const path = resolve(outDir, `${slug}.${ext}`);
    await writeFile(path, render(data), 'utf8');
    log.info(`escrito ${path}`);
  }

  // Un vistazo al resumen sin tener que abrir el archivo.
  log.info('');
  log.info(`${data.offer.providerName} - ${data.offer.quoteCode ?? 's/codigo'}`);
  log.info(
    `cobertura ${data.summary.covered}/${data.summary.requisitionItems} (${data.summary.coveragePct}%), ` +
      `${data.summary.needsReview} lineas a revisar`,
  );
}

function asFormat(value: string): Format {
  if (value in RENDERERS) return value as Format;
  throw new ConfigError(`formato desconocido: ${value}`, { validos: 'md, json, html, all' });
}

main()
  .then(() => closeDb())
  .then(() => process.exit(0))
  .catch(async (e: unknown) => {
    log.error(errorMessage(e));
    await closeDb();
    process.exit(1);
  });
