import { ExtractionError } from '../core/errors.js';

/* -------------------------------------------------------------------------- */
/* Numeros en formato es-AR                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Convierte un numero escrito a la argentina ("2.839,20") a number (2839.2).
 *
 * Este es el punto clasico de bugs silenciosos del pipeline: si se interpreta
 * "2.839,20" con parseFloat, da 2 y nadie se entera hasta que el total del
 * comparativo esta mil veces mal. Por eso es una funcion dedicada y testeada.
 *
 * Reglas:
 *  - Si aparecen "." y ",": manda el ULTIMO como separador decimal.
 *  - Si aparece solo ",": es decimal ("47,53" -> 47.53).
 *  - Si aparece solo ".": es ambiguo. Se resuelve por la cantidad de digitos a
 *    la derecha: exactamente 3 => separador de miles ("129.010" -> 129010);
 *    cualquier otra cantidad => decimal ("1.5" -> 1.5).
 *
 * El caso ambiguo real del dataset son los precios, que siempre traen dos
 * decimales, asi que la heuristica nunca decide sobre ellos.
 */
export function parseArgNumber(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;

  // Normaliza espacios (incluido el no-break space que meten los PDF) y saca
  // simbolos de moneda y separadores sueltos.
  let s = raw
    .replace(/ /g, ' ')
    .trim()
    .replace(/^(?:ars|usd|\$|u\$s)\s*/i, '')
    .replace(/\s/g, '');

  if (s === '' || s === '-') return null;

  let sign = 1;
  if (s.startsWith('-')) {
    sign = -1;
    s = s.slice(1);
  } else if (s.startsWith('+')) {
    s = s.slice(1);
  }

  if (!/^[\d.,]+$/.test(s)) {
    throw new ExtractionError('no es un numero reconocible', { valor: raw });
  }

  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');

  let normalized: string;
  if (lastDot >= 0 && lastComma >= 0) {
    // Ambos presentes: el ultimo es el decimal, el otro es de miles.
    const decimalSep = lastComma > lastDot ? ',' : '.';
    const thousandSep = decimalSep === ',' ? '.' : ',';
    normalized = s.split(thousandSep).join('').replace(decimalSep, '.');
  } else if (lastComma >= 0) {
    // Solo coma: siempre decimal en es-AR.
    normalized = s.replace(/,/g, (_m, offset: number) => (offset === lastComma ? '.' : ''));
  } else if (lastDot >= 0) {
    // Solo punto: ambiguo. 3 digitos a la derecha => miles.
    const decimals = s.length - lastDot - 1;
    const hasMultipleDots = s.indexOf('.') !== lastDot;
    normalized = hasMultipleDots || decimals === 3 ? s.split('.').join('') : s;
  } else {
    normalized = s;
  }

  const value = Number(normalized);
  if (!Number.isFinite(value)) {
    throw new ExtractionError('no es un numero reconocible', { valor: raw });
  }
  return sign * value;
}

/** Igual que parseArgNumber pero exige que haya un valor. */
export function requireArgNumber(
  raw: string | number | null | undefined,
  context: Record<string, string | number | undefined> = {},
): number {
  const value = parseArgNumber(raw);
  if (value === null) {
    throw new ExtractionError('se esperaba un numero y vino vacio', { ...context, valor: String(raw) });
  }
  return value;
}

/* -------------------------------------------------------------------------- */
/* Unidades de medida                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Unidades canonicas. Se guarda tambien la unidad cruda del proveedor, asi que
 * este mapa solo sirve para comparar peras con peras al conciliar.
 */
export const UNITS = [
  'unit',
  'meter',
  'roll',
  'box',
  'bag',
  'pack',
  'pair',
  'set',
  'kit',
  'can',
  'bucket',
  'drum',
  'liter',
  'tube',
  'cartridge',
  'sheet',
  'jar',
] as const;

export type Unit = (typeof UNITS)[number];

const UNIT_ALIAS_TABLE: Readonly<Record<string, Unit>> = {
    // unidad
    unidad: 'unit', unidades: 'unit', un: 'unit', u: 'unit', 'u.': 'unit', uds: 'unit', ud: 'unit', c_u: 'unit',
    // longitud
    metro: 'meter', metros: 'meter', mts: 'meter', mt: 'meter', m: 'meter', ml: 'meter',
    // presentaciones
    rollo: 'roll', rollos: 'roll', rll: 'roll',
    caja: 'box', cajas: 'box', cja: 'box',
    bolsa: 'bag', bolsas: 'bag',
    paquete: 'pack', paquetes: 'pack', pack: 'pack', paq: 'pack',
    par: 'pair', pares: 'pair',
    set: 'set', sets: 'set', juego: 'set',
    kit: 'kit', kits: 'kit',
    lata: 'can', latas: 'can',
    balde: 'bucket', baldes: 'bucket',
    bidon: 'drum', bidones: 'drum',
    litro: 'liter', litros: 'liter', lt: 'liter', l: 'liter',
    tubo: 'tube', tubos: 'tube',
    cartucho: 'cartridge', cartuchos: 'cartridge',
    hoja: 'sheet', hojas: 'sheet',
    pomo: 'jar', pomos: 'jar',
};

const UNIT_ALIASES: ReadonlyMap<string, Unit> = new Map(Object.entries(UNIT_ALIAS_TABLE));

/**
 * Lleva la unidad del proveedor a la canonica. Devuelve null si no se reconoce
 * (no es un error: se conserva el texto crudo y se avisa como warning).
 */
export function normalizeUnit(raw: string | null | undefined): Unit | null {
  if (!raw) return null;
  const key = stripAccents(raw)
    .toLowerCase()
    .trim()
    .replace(/\.$/, '')
    .replace(/\s+/g, '_');
  return UNIT_ALIASES.get(key) ?? UNIT_ALIASES.get(key.replace(/_/g, '')) ?? null;
}

/* -------------------------------------------------------------------------- */
/* Flags (columna "Notas" de la oferta)                                        */
/* -------------------------------------------------------------------------- */

export const FLAGS = [
  'technical_equivalent',
  'alternative_line',
  'partial_stock',
  'min_order_qty',
  'brand_to_confirm',
  'extra_suggested',
] as const;

export type Flag = (typeof FLAGS)[number];

/**
 * Vocabulario observado en los cuatro archivos de oferta del challenge.
 * Se compara por substring sobre el texto sin acentos y en minusculas, para
 * aguantar variaciones menores de redaccion.
 */
const FLAG_PATTERNS: ReadonlyArray<readonly [RegExp, Flag]> = [
  [/equivalente\s+tecnic/, 'technical_equivalent'],
  [/equivalente\s+alternativ|linea\s+alternativa|alternativa\s+para/, 'alternative_line'],
  [
    /stock\s+parcial|disponibilidad\s+parcial|cantidad\s+(?:disponible\s+)?menor|menor\s+a\s+(?:la|lo)\s+solicitad/,
    'partial_stock',
  ],
  [/bulto\s+minimo|presentacion\s+comercial|minimo\s+de\s+venta/, 'min_order_qty'],
  [/marca\s+a\s+confirmar/, 'brand_to_confirm'],
  [/adicional\s+sugerido|adicional\s+no\s+pedido|sugerido\s+para\s+stock/, 'extra_suggested'],
];

export interface NotesParseResult {
  readonly flags: readonly Flag[];
  /** Fragmentos de la nota que no matchearon ningun patron conocido. */
  readonly unrecognized: readonly string[];
}

/**
 * Normaliza la columna de notas a flags. Las notas del dataset vienen
 * separadas por ";" cuando hay mas de una.
 */
export function parseNotes(raw: string | null | undefined): NotesParseResult {
  if (!raw || !raw.trim()) return { flags: [], unrecognized: [] };

  const flags = new Set<Flag>();
  const unrecognized: string[] = [];

  for (const fragment of raw.split(/[;|]/)) {
    const text = stripAccents(fragment).toLowerCase().trim();
    if (!text) continue;
    let matched = false;
    for (const [pattern, flag] of FLAG_PATTERNS) {
      if (pattern.test(text)) {
        flags.add(flag);
        matched = true;
      }
    }
    if (!matched) unrecognized.push(fragment.trim());
  }

  return { flags: [...flags], unrecognized };
}

/* -------------------------------------------------------------------------- */
/* Descripciones                                                               */
/* -------------------------------------------------------------------------- */

export interface DescriptionParseResult {
  /** Descripcion limpia, apta para embeber. */
  readonly description: string;
  /** Flags deducidos de los marcadores que traia el texto. */
  readonly flags: readonly Flag[];
}

/**
 * Algunas lineas del PDF de Mantenimiento Integral llevan el marcador dentro de
 * la descripcion en vez de en la columna de notas:
 *
 *   "Equivalente tecnico Conductor flexible 4 mm2 verde amarillo"
 *   "Interruptor automatico 2 polos 16 A linea alternativa"
 *
 * Hay que sacarlos antes de generar el embedding: si no, el vector queda
 * contaminado por un texto que se repite en 26 lineas distintas y que no dice
 * nada del producto. El marcador no se pierde, se convierte en flag.
 */
export function parseDescription(raw: string): DescriptionParseResult {
  let description = raw.replace(/\s+/g, ' ').trim();
  const flags = new Set<Flag>();

  const prefix = /^equivalente\s+tecnic[oa]s?\s+/i;
  const suffix = /\s+linea\s+alternativa$/i;

  // Se compara sobre la version sin acentos pero se corta sobre el original,
  // para no alterar la descripcion que ve el comprador.
  const probe = stripAccents(description).toLowerCase();

  const prefixMatch = probe.match(prefix);
  if (prefixMatch) {
    description = description.slice(prefixMatch[0].length).trim();
    flags.add('technical_equivalent');
  }

  const suffixMatch = stripAccents(description).toLowerCase().match(suffix);
  if (suffixMatch) {
    description = description.slice(0, description.length - suffixMatch[0].length).trim();
    flags.add('alternative_line');
  }

  return { description, flags: [...flags] };
}

/** Texto canonico que se manda a embeber: descripcion + unidad. */
export function embeddingText(description: string, unit: Unit | null): string {
  const clean = stripAccents(description).toLowerCase().replace(/\s+/g, ' ').trim();
  return unit ? `${clean} [${unit}]` : clean;
}

/* -------------------------------------------------------------------------- */

/** Toda marca diacritica combinante, una vez descompuesto el texto con NFD. */
const COMBINING_MARKS = /\p{M}/gu;

/** Saca tildes y dieresis. El dataset entero esta escrito sin acentos, pero
 *  las ofertas reales no lo estan. */
export function stripAccents(s: string): string {
  return s.normalize('NFD').replace(COMBINING_MARKS, '');
}
