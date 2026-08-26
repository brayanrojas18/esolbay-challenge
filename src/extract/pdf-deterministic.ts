import {
  normalizeUnit,
  parseArgNumber,
  parseDescription,
  parseNotes,
  stripAccents,
  type Flag,
} from './normalize.js';
import type { ExtractedOfferHeader, ExtractedOfferItem, ExtractionWarning } from './schemas.js';

/**
 * Parseo deterministico del PDF, sin LLM.
 *
 * Cumple dos funciones distintas y ambas valen:
 *
 *  1. Es el camino de --dry-run: permite desarrollar, testear y correr el
 *     pipeline entero sin API key y sin gastar un centavo.
 *  2. Es el oraculo de los tests del camino con LLM. Tener una segunda
 *     implementacion independiente sobre el mismo texto es la unica forma
 *     barata de detectar que el modelo alucino un precio.
 *
 * No reemplaza al LLM en produccion: esta afinado al layout de ESTE PDF. Una
 * oferta real llega con otra diagramacion y el LLM la absorbe sin tocar codigo.
 * Ver docs/DECISIONS.md.
 */

/**
 * Vocabulario de unidades tal como aparecen en el PDF. Es la ancla del parseo:
 * en la fila "... rojo 1000 metro 441,35", "metro" es lo unico que separa sin
 * ambiguedad la descripcion (que contiene numeros como "1.5 mm2") de la
 * cantidad y el precio.
 */
const UNIT_WORDS = [
  'unidad', 'unidades', 'metro', 'metros', 'rollo', 'rollos', 'caja', 'cajas',
  'bolsa', 'bolsas', 'paquete', 'paquetes', 'pack', 'par', 'pares', 'set',
  'sets', 'kit', 'kits', 'lata', 'latas', 'balde', 'baldes', 'bidon',
  'bidones', 'litro', 'litros', 'tubo', 'tubos', 'cartucho', 'cartuchos',
  'hoja', 'hojas', 'pomo', 'pomos', 'juego', 'mts', 'un', 'u',
] as const;

/**
 * Fila completa de la tabla:
 *   linea | codigo | descripcion | cantidad | unidad | precio | notas?
 *
 * La descripcion es no-greedy y la cantidad tiene que estar pegada a la unidad,
 * asi una descripcion que empieza con "Rollo" (linea 176) no se confunde con la
 * columna de unidad.
 */
const ROW = new RegExp(
  '^(\\d{1,4})\\s+' +                       // linea
  '([A-Z]{2,5}-[A-Z0-9]{3,8})\\s+' +        // codigo del proveedor
  '(.+?)\\s+' +                             // descripcion (no-greedy)
  '(\\d[\\d.]*(?:,\\d+)?)\\s+' +            // cantidad
  `(${UNIT_WORDS.join('|')})\\s+` +         // unidad
  '([\\d.]*\\d(?:,\\d{1,2})?)' +            // precio unitario
  '(?:\\s+(.*))?$',                         // notas (opcional)
  'i',
);

export interface DeterministicParseResult {
  readonly items: readonly ExtractedOfferItem[];
  readonly warnings: readonly ExtractionWarning[];
  /** Lineas de texto que no matchearon el patron de fila. */
  readonly unparsed: readonly string[];
}

export function parsePdfRows(bodyLines: readonly string[]): DeterministicParseResult {
  const items: ExtractedOfferItem[] = [];
  const warnings: ExtractionWarning[] = [];
  const unparsed: string[] = [];

  for (const line of bodyLines) {
    const m = ROW.exec(line);
    if (!m) {
      unparsed.push(line);
      continue;
    }

    const [, rawLineNo, supplierCode, rawDescription, rawQuantity, rawUnit, rawPrice, rawNotes] = m;

    const lineNo = Number(rawLineNo);
    const { description, flags: descriptionFlags } = parseDescription(rawDescription ?? '');

    const notes = parseNotes(rawNotes ?? null);
    for (const unknownNote of notes.unrecognized) {
      warnings.push({
        code: 'unknown_note',
        message: `nota sin flag conocido en la linea ${lineNo}: "${unknownNote}"`,
        lineNo,
      });
    }

    const unitOfMeasure = normalizeUnit(rawUnit ?? null);
    if (rawUnit && !unitOfMeasure) {
      warnings.push({
        code: 'unknown_unit',
        message: `unidad no reconocida en la linea ${lineNo}: "${rawUnit}"`,
        lineNo,
      });
    }

    const unitPrice = parseArgNumber(rawPrice ?? null);
    if (unitPrice === null) {
      warnings.push({ code: 'missing_price', message: `la linea ${lineNo} no trae precio`, lineNo });
    }

    const flags = new Set<Flag>([...descriptionFlags, ...notes.flags]);

    items.push({
      lineNo,
      supplierCode: supplierCode ?? null,
      offeredDescription: description,
      offeredQuantity: parseArgNumber(rawQuantity ?? null) ?? 0,
      unitOfMeasure,
      rawUnit: rawUnit ?? null,
      unitPrice,
      rawNotes: rawNotes?.trim() || null,
      flags: [...flags],
    });
  }

  return { items, warnings, unparsed };
}

/* -------------------------------------------------------------------------- */
/* Cabecera comercial                                                          */
/* -------------------------------------------------------------------------- */

const QUOTE_CODE = /\b[A-Z][A-Z0-9]{1,5}(?:-[A-Z0-9]+){2,}\b/;

/**
 * La cabecera del PDF viene como cuatro lineas "Etiqueta: valor". Es
 * deterministica; usar el LLM aca seria pagar por adivinar lo obvio.
 */
export function parsePdfHeader(headerBlock: string, fallbackName: string): ExtractedOfferHeader {
  let providerName: string | null = null;
  let quoteCode: string | null = null;
  let quoteDate: string | null = null;
  let terms: string | null = null;

  for (const line of headerBlock.split('\n')) {
    const text = line.trim();
    if (!text) continue;

    const probe = stripAccents(text).toLowerCase();
    const value = text.slice(text.indexOf(':') + 1).trim();

    if (probe.startsWith('proveedor')) providerName ??= value;
    else if (probe.startsWith('fecha')) quoteDate ??= normalizeIsoDate(value);
    else if (probe.startsWith('condiciones')) terms ??= value;

    if (quoteCode === null) {
      const m = text.match(QUOTE_CODE);
      if (m?.[0]) quoteCode = m[0];
    }
  }

  return {
    providerName: providerName ?? fallbackName,
    quoteCode,
    quoteDate,
    terms,
    currency: null,
  };
}

function normalizeIsoDate(value: string): string | null {
  const iso = value.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const dmy = value.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy?.[1] && dmy[2] && dmy[3]) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }
  return null;
}
