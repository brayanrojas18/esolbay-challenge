import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { log } from '../core/logger.js';
import { extractOfferItemsWithLlm, type LlmExtractionOutcome } from '../ai/extract-items.js';
import { parsePdfHeader, parsePdfRows } from './pdf-deterministic.js';
import { readPdfText } from './pdf-text.js';
import { detectLineGaps } from './xlsx.js';
import {
  extractedOfferSchema,
  type ExtractedOffer,
  type ExtractedOfferItem,
  type ExtractionWarning,
} from './schemas.js';

/**
 * Extraccion de ofertas en PDF.
 *
 * Un PDF no tiene estructura garantizada, asi que el camino principal es el
 * LLM. El parser deterministico corre en paralelo con dos usos: es el modo
 * --dry-run sin API, y es el verificador -- si los dos leen distinto un precio,
 * queda como warning en la trazabilidad.
 */

export interface PdfExtractionOptions {
  readonly filePath: string;
  /** No llama a la API: usa solo el parser deterministico. */
  readonly dryRun: boolean;
  /** Lineas por llamada al LLM. */
  readonly batchSize?: number;
  /** Llamadas simultaneas. */
  readonly concurrency?: number;
}

export async function extractFromPdf({
  filePath,
  dryRun,
  batchSize = 40,
  concurrency = 3,
}: PdfExtractionOptions): Promise<ExtractedOffer> {
  const started = performance.now();
  const buffer = await readFile(filePath);
  const sourceHash = createHash('sha256').update(buffer).digest('hex');
  const filename = basename(filePath);

  const text = await readPdfText(buffer);
  const warnings: ExtractionWarning[] = [];

  if (text.droppedHeaderRows > 0) {
    log.debug('encabezados de tabla descartados', {
      cantidad: text.droppedHeaderRows,
      paginas: text.pageCount,
    });
  }

  // La cabecera son cuatro lineas "Etiqueta: valor": no necesita LLM.
  const fallbackName = filename.replace(/\.[^.]+$/, '').replace(/^oferta[_-]/i, '').replace(/[_-]+/g, ' ');
  const header = parsePdfHeader(text.headerBlock, fallbackName);
  if (header.providerName === fallbackName) {
    warnings.push({
      code: 'header_fallback',
      message: `no se encontro el proveedor en la cabecera; se derivo del nombre del archivo: "${fallbackName}"`,
      lineNo: null,
    });
  }

  const deterministic = parsePdfRows(text.bodyLines);
  for (const line of deterministic.unparsed) {
    log.debug('linea no reconocida por el parser deterministico', { linea: line.slice(0, 80) });
  }

  let items: readonly ExtractedOfferItem[];
  let llm: LlmExtractionOutcome | null = null;

  if (dryRun) {
    items = deterministic.items;
    warnings.push(...deterministic.warnings);
    if (deterministic.unparsed.length > 0) {
      warnings.push({
        code: 'llm_failed',
        message:
          `${deterministic.unparsed.length} lineas no matchearon el patron de fila y se perdieron ` +
          `(en --dry-run no hay LLM que las recupere)`,
        lineNo: null,
      });
    }
  } else {
    llm = await extractOfferItemsWithLlm({
      bodyLines: text.bodyLines,
      batchSize,
      concurrency,
    });
    items = llm.items;
    warnings.push(...llm.warnings);
    warnings.push(...crossCheck(llm.items, deterministic.items));
  }

  warnings.push(...detectLineGaps(items));

  return extractedOfferSchema.parse({
    header,
    items: [...items].sort((a, b) => a.lineNo - b.lineNo),
    meta: {
      sourceFormat: 'pdf',
      sourceFilename: filename,
      sourceHash,
      strategy: dryRun ? 'deterministic' : 'llm+deterministic',
      modelUsed: llm?.modelUsed ?? null,
      llmCalls: llm?.calls ?? 0,
      inputTokens: llm?.inputTokens ?? 0,
      outputTokens: llm?.outputTokens ?? 0,
      batches: llm?.batches ?? 0,
      durationMs: performance.now() - started,
      warnings,
    },
  } satisfies ExtractedOffer);
}

/**
 * Compara la salida del LLM contra la del parser deterministico.
 * No corrige nada: reporta. Cual de las dos tiene razon lo decide una persona.
 */
export function crossCheck(
  llmItems: readonly ExtractedOfferItem[],
  deterministicItems: readonly ExtractedOfferItem[],
): ExtractionWarning[] {
  if (deterministicItems.length === 0) return [];

  const warnings: ExtractionWarning[] = [];
  const byLine = new Map(deterministicItems.map((i) => [i.lineNo, i]));

  for (const item of llmItems) {
    const reference = byLine.get(item.lineNo);
    if (!reference) continue;

    if (reference.unitPrice !== null && item.unitPrice !== reference.unitPrice) {
      warnings.push({
        code: 'llm_retry',
        message:
          `linea ${item.lineNo}: el LLM leyo un precio unitario de ${item.unitPrice} y el parser ` +
          `deterministico ${reference.unitPrice}`,
        lineNo: item.lineNo,
      });
    }

    if (item.offeredQuantity !== reference.offeredQuantity) {
      warnings.push({
        code: 'llm_retry',
        message:
          `linea ${item.lineNo}: el LLM leyo una cantidad de ${item.offeredQuantity} y el parser ` +
          `deterministico ${reference.offeredQuantity}`,
        lineNo: item.lineNo,
      });
    }

    if (reference.supplierCode && item.supplierCode !== reference.supplierCode) {
      warnings.push({
        code: 'llm_retry',
        message:
          `linea ${item.lineNo}: el LLM leyo el codigo "${item.supplierCode}" y el parser ` +
          `deterministico "${reference.supplierCode}"`,
        lineNo: item.lineNo,
      });
    }
  }

  const llmLines = new Set(llmItems.map((i) => i.lineNo));
  for (const reference of deterministicItems) {
    if (!llmLines.has(reference.lineNo)) {
      warnings.push({
        code: 'llm_failed',
        message: `linea ${reference.lineNo}: el parser deterministico la encontro y el LLM la omitio`,
        lineNo: reference.lineNo,
      });
    }
  }

  return warnings;
}
