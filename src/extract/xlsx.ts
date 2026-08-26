import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import * as XLSX from 'xlsx';
import { ExtractionError } from '../core/errors.js';
import {
  normalizeUnit,
  parseArgNumber,
  parseDescription,
  parseNotes,
  type Flag,
} from './normalize.js';
import {
  extractedOfferSchema,
  type ExtractedOffer,
  type ExtractedOfferHeader,
  type ExtractedOfferItem,
  type ExtractionWarning,
} from './schemas.js';

/**
 * Extraccion de ofertas en XLSX: 100% deterministica, sin LLM.
 *
 * La planilla es tabular y regular, asi que mandarla a un modelo seria pagar
 * tokens para obtener un resultado peor: 225 filas no entran comodas en una
 * llamada, y cualquier alucinacion sobre un precio es un error que nadie
 * detecta despues. Codigo donde alcanza, IA donde aporta.
 *
 * Estructura observada en los dos XLSX del challenge:
 *
 *   fila 1   A: "Cotizacion COT-OFN-2026-051"
 *   fila 2   A: "Proveedor"     B: "Oficenter Norte SA"
 *   fila 3   A: "Fecha"         B: "2026-05-20"
 *   fila 4   A: "Condiciones"   B: "Entrega estimada dentro de..."
 *   fila 5   (vacia)
 *   fila 6   headers: line_no | supplier_code | offered_description |
 *                     offered_quantity | unit | unit_price | notes
 *   fila 7+  datos
 *
 * Igual no se asume: la fila de headers se busca, y las etiquetas se resuelven
 * por sinonimos para aguantar una planilla en castellano o con otro orden.
 */

/** Sinonimos por campo, normalizados a minusculas sin espacios ni guiones. */
const COLUMN_SYNONYMS: Record<string, readonly string[]> = {
  lineNo: ['lineno', 'linea', 'line', 'nro', 'numero', 'item', 'nrolinea'],
  supplierCode: ['suppliercode', 'codigoproveedor', 'codigo', 'code', 'sku', 'articulo'],
  offeredDescription: ['offereddescription', 'descripcionofertada', 'descripcion', 'description', 'detalle', 'producto'],
  offeredQuantity: ['offeredquantity', 'cantidadofertada', 'cantidad', 'quantity', 'qty', 'cant'],
  unit: ['unit', 'unidad', 'unidaddemedida', 'unitofmeasure', 'um', 'medida'],
  unitPrice: ['unitprice', 'preciounitario', 'preciounit', 'precio', 'price', 'punitario'],
  notes: ['notes', 'notas', 'observaciones', 'observacion', 'comentarios', 'nota'],
};

const HEADER_SEARCH_DEPTH = 25;

/**
 * Codigo de cotizacion: sigla en mayusculas seguida de al menos dos grupos
 * separados por guion ("COT-OFN-2026-051").
 *
 * Es sensible a mayusculas a proposito. Con el flag /i, "COT" matchea las tres
 * primeras letras de "Cotizacion" y el codigo extraido termina siendo la propia
 * etiqueta de la fila.
 */
const QUOTE_CODE = /\b[A-Z][A-Z0-9]{1,5}(?:-[A-Z0-9]+){2,}\b/;

function canon(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function cellText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
}

/**
 * Localiza la fila de encabezados y devuelve, por campo, el indice de columna.
 * Se queda con la fila que mas campos distintos reconoce.
 */
function findHeaderRow(grid: readonly (readonly unknown[])[]): {
  rowIndex: number;
  columns: Partial<Record<keyof typeof COLUMN_SYNONYMS, number>>;
} {
  let best = { rowIndex: -1, columns: {} as Partial<Record<string, number>>, score: 0 };

  const depth = Math.min(grid.length, HEADER_SEARCH_DEPTH);
  for (let r = 0; r < depth; r++) {
    const row = grid[r];
    if (!row) continue;

    const columns: Partial<Record<string, number>> = {};
    for (let c = 0; c < row.length; c++) {
      const label = canon(row[c]);
      if (!label) continue;
      for (const [field, synonyms] of Object.entries(COLUMN_SYNONYMS)) {
        if (columns[field] === undefined && synonyms.includes(label)) {
          columns[field] = c;
          break;
        }
      }
    }

    const score = Object.keys(columns).length;
    if (score > best.score) best = { rowIndex: r, columns, score };
  }

  // Sin descripcion y cantidad no hay oferta que valga.
  if (best.columns['offeredDescription'] === undefined || best.columns['offeredQuantity'] === undefined) {
    throw new ExtractionError(
      'no se encontro la fila de encabezados: falta la columna de descripcion o la de cantidad',
      { filasInspeccionadas: depth },
    );
  }

  return best as { rowIndex: number; columns: Partial<Record<keyof typeof COLUMN_SYNONYMS, number>> };
}

/**
 * Lee la cabecera comercial de las filas previas a la tabla.
 * Formato "etiqueta en A, valor en B", mas una primera fila suelta con el
 * codigo de cotizacion.
 */
function parseHeader(
  grid: readonly (readonly unknown[])[],
  headerRowIndex: number,
  filename: string,
  warnings: ExtractionWarning[],
): ExtractedOfferHeader {
  let providerName: string | null = null;
  let quoteCode: string | null = null;
  let quoteDate: string | null = null;
  let terms: string | null = null;

  for (let r = 0; r < headerRowIndex; r++) {
    const row = grid[r];
    if (!row) continue;

    const label = canon(row[0]);
    const value = cellText(row[1]);

    if (label === 'proveedor' || label === 'provider' || label === 'razonsocial') {
      providerName ??= value;
    } else if (label === 'fecha' || label === 'date') {
      quoteDate ??= normalizeDate(value);
    } else if (label === 'condiciones' || label === 'terms' || label === 'condicionescomerciales') {
      terms ??= value;
    } else if (label === 'cotizacion' || label === 'quote' || label === 'codigo') {
      quoteCode ??= value;
    } else {
      // Fila suelta tipo "Cotizacion COT-OFN-2026-051" en una sola celda.
      const solo = cellText(row[0]);
      if (solo && quoteCode === null) {
        const m = solo.match(QUOTE_CODE);
        if (m?.[0]) quoteCode = m[0].trim();
      }
    }
  }

  if (!providerName) {
    // El nombre del archivo es el ultimo recurso: mejor eso que abortar.
    providerName = basename(filename)
      .replace(/\.[^.]+$/, '')
      .replace(/^oferta[_-]/i, '')
      .replace(/[_-]+/g, ' ')
      .trim();
    warnings.push({
      code: 'header_fallback',
      message: `no se encontro el nombre del proveedor en la cabecera; se derivo del nombre del archivo: "${providerName}"`,
      lineNo: null,
    });
  }

  return { providerName, quoteCode, quoteDate, terms, currency: null };
}

/** Acepta ISO, dd/mm/yyyy y el serial numerico de Excel. */
function normalizeDate(value: string | null): string | null {
  if (!value) return null;

  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const dmy = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy?.[1] && dmy[2] && dmy[3]) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }

  const serial = Number(value);
  if (Number.isFinite(serial) && serial > 20000 && serial < 60000) {
    const parsed = XLSX.SSF.parse_date_code(serial);
    if (parsed) {
      const mm = String(parsed.m).padStart(2, '0');
      const dd = String(parsed.d).padStart(2, '0');
      return `${parsed.y}-${mm}-${dd}`;
    }
  }

  return null;
}

export interface XlsxExtractionOptions {
  /** Ruta del archivo .xlsx */
  readonly filePath: string;
}

export async function extractFromXlsx({ filePath }: XlsxExtractionOptions): Promise<ExtractedOffer> {
  const started = performance.now();
  const buffer = await readFile(filePath);
  const sourceHash = createHash('sha256').update(buffer).digest('hex');

  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false, raw: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new ExtractionError('el archivo no tiene hojas', { archivo: filePath });

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new ExtractionError('no se pudo leer la hoja', { hoja: sheetName });

  // header:1 devuelve una matriz cruda, que es lo que hace falta para localizar
  // la fila de headers a mano en vez de asumir que es la primera.
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: true,
    defval: null,
    raw: true,
  });

  const warnings: ExtractionWarning[] = [];
  const { rowIndex, columns } = findHeaderRow(grid);
  const header = parseHeader(grid, rowIndex, filePath, warnings);

  const items: ExtractedOfferItem[] = [];
  const seenLineNos = new Set<number>();
  let fallbackLineNo = 0;

  for (let r = rowIndex + 1; r < grid.length; r++) {
    const row = grid[r];
    if (!row) continue;

    const at = (field: keyof typeof COLUMN_SYNONYMS): unknown => {
      const index = columns[field];
      return index === undefined ? null : row[index];
    };

    const rawDescription = cellText(at('offeredDescription'));
    if (!rawDescription) continue; // fila vacia o de totales

    const excelRow = r + 1; // 1-based, como lo ve el usuario en Excel

    let lineNo = Math.trunc(parseArgNumber(cellText(at('lineNo'))) ?? 0);
    if (lineNo <= 0) lineNo = ++fallbackLineNo;
    else fallbackLineNo = Math.max(fallbackLineNo, lineNo);

    if (seenLineNos.has(lineNo)) {
      warnings.push({
        code: 'duplicate_line',
        message: `el numero de linea ${lineNo} aparece mas de una vez (fila ${excelRow} del Excel)`,
        lineNo,
      });
    }
    seenLineNos.add(lineNo);

    const { description, flags: descriptionFlags } = parseDescription(rawDescription);

    const rawNotes = cellText(at('notes'));
    const notes = parseNotes(rawNotes);
    for (const unknownNote of notes.unrecognized) {
      warnings.push({
        code: 'unknown_note',
        message: `nota sin flag conocido en la linea ${lineNo}: "${unknownNote}"`,
        lineNo,
      });
    }

    const rawUnit = cellText(at('unit'));
    const unitOfMeasure = normalizeUnit(rawUnit);
    if (rawUnit && !unitOfMeasure) {
      warnings.push({
        code: 'unknown_unit',
        message: `unidad no reconocida en la linea ${lineNo}: "${rawUnit}"`,
        lineNo,
      });
    }

    let unitPrice: number | null = null;
    try {
      unitPrice = parseArgNumber(cellText(at('unitPrice')));
    } catch (e) {
      warnings.push({
        code: 'missing_price',
        message: `precio ilegible en la linea ${lineNo}: ${e instanceof Error ? e.message : String(e)}`,
        lineNo,
      });
    }
    if (unitPrice === null) {
      warnings.push({ code: 'missing_price', message: `la linea ${lineNo} no trae precio`, lineNo });
    }

    const quantity = parseArgNumber(cellText(at('offeredQuantity')));
    if (quantity === null) {
      throw new ExtractionError('linea sin cantidad', { linea: lineNo, filaExcel: excelRow });
    }

    const flags = new Set<Flag>([...descriptionFlags, ...notes.flags]);

    items.push({
      lineNo,
      supplierCode: cellText(at('supplierCode')),
      offeredDescription: description,
      offeredQuantity: quantity,
      unitOfMeasure,
      rawUnit,
      unitPrice,
      rawNotes,
      flags: [...flags],
    });
  }

  if (items.length === 0) {
    throw new ExtractionError('no se extrajo ninguna linea', { archivo: filePath, hoja: sheetName });
  }

  warnings.push(...detectLineGaps(items));

  return extractedOfferSchema.parse({
    header,
    items,
    meta: {
      sourceFormat: 'xlsx',
      sourceFilename: basename(filePath),
      sourceHash,
      strategy: 'deterministic',
      modelUsed: null,
      llmCalls: 0,
      inputTokens: 0,
      outputTokens: 0,
      batches: 0,
      durationMs: performance.now() - started,
      warnings,
    },
  } satisfies ExtractedOffer);
}

/**
 * Verifica la continuidad de la numeracion. Un hueco casi siempre significa que
 * se perdio una linea al extraer, y el comprador tiene que enterarse.
 */
export function detectLineGaps(items: readonly ExtractedOfferItem[]): ExtractionWarning[] {
  const numbers = [...new Set(items.map((i) => i.lineNo))].sort((a, b) => a - b);
  const warnings: ExtractionWarning[] = [];

  for (let i = 1; i < numbers.length; i++) {
    const previous = numbers[i - 1]!;
    const current = numbers[i]!;
    if (current !== previous + 1) {
      const missing = current - previous - 1;
      warnings.push({
        code: 'line_gap',
        message:
          missing === 1
            ? `falta la linea ${previous + 1}`
            : `faltan ${missing} lineas entre la ${previous} y la ${current}`,
        lineNo: previous + 1,
      });
    }
  }

  return warnings;
}
