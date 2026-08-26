import { extractText, getDocumentProxy } from 'unpdf';
import { ExtractionError } from '../core/errors.js';
import { stripAccents } from './normalize.js';

/**
 * Lectura del texto del PDF y limpieza previa a cualquier parseo.
 *
 * Se mantiene separado del parseo porque tanto el camino deterministico como el
 * del LLM consumen exactamente el mismo texto limpio. Asi las dos estrategias
 * son comparables: si difieren, la diferencia esta en la interpretacion, no en
 * la entrada.
 */

export interface PdfText {
  readonly pageCount: number;
  /** Texto de cada pagina, ya sin la fila de encabezado repetida. */
  readonly pages: readonly string[];
  /** Bloque de cabecera comercial (lo que precede a la tabla en la pagina 1). */
  readonly headerBlock: string;
  /** Lineas de la tabla de todas las paginas, concatenadas y sin encabezados. */
  readonly bodyLines: readonly string[];
  /** Cuantas repeticiones del encabezado se descartaron. */
  readonly droppedHeaderRows: number;
}

/**
 * Etiquetas de la fila de encabezado de la tabla. El PDF de Mantenimiento
 * Integral la repite en las 7 paginas; si no se descartan, entran al lote del
 * LLM como si fueran productos y contaminan la numeracion de lineas.
 */
const TABLE_HEADER_TOKENS = [
  'linea',
  'codigo proveedor',
  'descripcion ofertada',
  'cantidad',
  'unidad',
  'precio unit',
];

/** True si la linea es la fila de encabezado de la tabla. */
export function isTableHeaderRow(line: string): boolean {
  const probe = stripAccents(line).toLowerCase();
  // Se exigen al menos 4 de las 6 etiquetas para no descartar por accidente una
  // linea de producto que casualmente diga "cantidad".
  const hits = TABLE_HEADER_TOKENS.filter((t) => probe.includes(t)).length;
  return hits >= 4;
}

/** Pie de pagina tipo "Pagina 3 de 7" o numeros sueltos de paginacion. */
function isPageFurniture(line: string): boolean {
  const probe = stripAccents(line).toLowerCase().trim();
  return /^pagina\s+\d+(\s+de\s+\d+)?$/.test(probe) || /^\d+\s*\/\s*\d+$/.test(probe);
}

export async function readPdfText(buffer: Buffer): Promise<PdfText> {
  let pageCount: number;
  let rawPages: string[];

  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const result = await extractText(pdf, { mergePages: false });
    pageCount = result.totalPages;
    rawPages = result.text;
  } catch (e) {
    throw new ExtractionError('no se pudo leer el PDF', {}, { cause: e });
  }

  if (rawPages.length === 0) {
    throw new ExtractionError('el PDF no tiene texto extraible (posible escaneo)', { pageCount: 0 });
  }

  let droppedHeaderRows = 0;
  let headerBlock = '';
  const pages: string[] = [];
  const bodyLines: string[] = [];

  for (let p = 0; p < rawPages.length; p++) {
    const lines = (rawPages[p] ?? '')
      .split('\n')
      .map((l) => l.replace(/\s+/g, ' ').trim())
      .filter((l) => l.length > 0 && !isPageFurniture(l));

    const kept: string[] = [];
    let seenTableHeader = false;

    for (const line of lines) {
      if (isTableHeaderRow(line)) {
        droppedHeaderRows++;
        seenTableHeader = true;
        continue;
      }
      // Todo lo que en la pagina 1 precede al encabezado de la tabla es la
      // cabecera comercial de la oferta.
      if (p === 0 && !seenTableHeader) {
        headerBlock += line + '\n';
        continue;
      }
      kept.push(line);
    }

    pages.push(kept.join('\n'));
    bodyLines.push(...kept);
  }

  if (bodyLines.length === 0) {
    throw new ExtractionError('el PDF no tiene filas de tabla despues de limpiar encabezados', {
      pageCount,
    });
  }

  return {
    pageCount,
    pages,
    headerBlock: headerBlock.trim(),
    bodyLines,
    droppedHeaderRows,
  };
}
