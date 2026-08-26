import { extname } from 'node:path';
import { ExtractionError } from '../core/errors.js';
import { extractFromPdf } from './pdf.js';
import { extractFromXlsx } from './xlsx.js';
import type { ExtractedOffer } from './schemas.js';

/**
 * Punto de entrada unico de la extraccion: detecta el formato por extension y
 * delega. Las dos ramas devuelven la misma estructura validada.
 */
export async function extractOffer(
  filePath: string,
  options: { dryRun: boolean },
): Promise<ExtractedOffer> {
  const ext = extname(filePath).toLowerCase();

  switch (ext) {
    case '.xlsx':
    case '.xlsm':
    case '.xls':
      // El XLSX es deterministico: --dry-run no cambia nada, ya era gratis.
      return extractFromXlsx({ filePath });
    case '.pdf':
      return extractFromPdf({ filePath, dryRun: options.dryRun });
    default:
      throw new ExtractionError('formato de archivo no soportado', {
        extension: ext || '(sin extension)',
        soportados: '.pdf, .xlsx',
      });
  }
}

export type { ExtractedOffer, ExtractedOfferItem } from './schemas.js';
