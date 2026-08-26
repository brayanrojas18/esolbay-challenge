import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * Lector de `reconciliation_guide.md`.
 *
 * ============================================================================
 * ESTE ARCHIVO VIVE EN tests/ A PROPOSITO Y NO DEBE IMPORTARSE DESDE src/.
 *
 * El enunciado del challenge dice, textual: "Tu aplicacion no deberia depender
 * de ese archivo como input automatico". La guia es la referencia contra la
 * cual se valida el resultado, no una fuente de datos del sistema. Usarla en
 * runtime seria hacer trampa.
 * ============================================================================
 *
 * Vocabulario de la guia (distinto del que propone cualquier spec externa):
 *   match | partial_quantity | semantic_match | missing_from_offer | extra
 */

export type GuideRelation =
  | 'match'
  | 'partial_quantity'
  | 'semantic_match'
  | 'missing_from_offer'
  | 'extra';

export interface GuideRow {
  /** Numero de item solicitado, o null si la fila es un sobrante. */
  readonly requisitionLineNo: number | null;
  readonly requestedDescription: string | null;
  readonly requestedQuantity: number | null;
  /** Numero de linea de la oferta, o null si es un faltante. */
  readonly offerLineNo: number | null;
  readonly supplierCode: string | null;
  readonly offeredDescription: string | null;
  readonly offeredQuantity: number | null;
  readonly relation: GuideRelation;
  readonly explanation: string;
}

export interface GuideSection {
  /** Nombre del archivo de oferta, ej. "oferta_oficenter_norte.xlsx". */
  readonly offerFile: string;
  readonly covered: number;
  readonly missing: number;
  readonly extra: number;
  readonly rows: readonly GuideRow[];
}

const RELATIONS = new Set<string>([
  'match',
  'partial_quantity',
  'semantic_match',
  'missing_from_offer',
  'extra',
]);

function cell(value: string | undefined): string | null {
  const text = (value ?? '').trim();
  return text === '' ? null : text;
}

function num(value: string | undefined): number | null {
  const text = cell(value);
  if (text === null) return null;
  const parsed = Number(text.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

/** Parsea la guia completa de un escenario y devuelve una seccion por oferta. */
export async function readGuide(scenarioDir: string): Promise<GuideSection[]> {
  const raw = await readFile(resolve(scenarioDir, 'reconciliation_guide.md'), 'utf8');
  const lines = raw.split('\n');

  const sections: GuideSection[] = [];
  let current: {
    offerFile: string;
    covered: number;
    missing: number;
    extra: number;
    rows: GuideRow[];
  } | null = null;

  const push = () => {
    if (current) sections.push({ ...current, rows: current.rows });
  };

  for (const line of lines) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading?.[1]) {
      push();
      current = { offerFile: heading[1], covered: 0, missing: 0, extra: 0, rows: [] };
      continue;
    }

    if (!current) continue;

    const covered = line.match(/^-\s*Items solicitados cubiertos:\s*(\d+)/i);
    if (covered?.[1]) {
      current.covered = Number(covered[1]);
      continue;
    }
    const missing = line.match(/^-\s*Items solicitados faltantes:\s*(\d+)/i);
    if (missing?.[1]) {
      current.missing = Number(missing[1]);
      continue;
    }
    const extra = line.match(/^-\s*Items sobrantes en oferta:\s*(\d+)/i);
    if (extra?.[1]) {
      current.extra = Number(extra[1]);
      continue;
    }

    if (!line.startsWith('|')) continue;

    // Fila de tabla. Se descartan la cabecera y el separador.
    const cells = line.split('|').slice(1, -1);
    if (cells.length < 9) continue;

    const relation = cell(cells[7]);
    if (relation === null || !RELATIONS.has(relation)) continue;

    current.rows.push({
      requisitionLineNo: num(cells[0]),
      requestedDescription: cell(cells[1]),
      requestedQuantity: num(cells[2]),
      offerLineNo: num(cells[3]),
      supplierCode: cell(cells[4]),
      offeredDescription: cell(cells[5]),
      offeredQuantity: num(cells[6]),
      relation: relation as GuideRelation,
      explanation: cell(cells[8]) ?? '',
    });
  }

  push();
  return sections;
}

/** Busca la seccion de una oferta puntual. */
export async function readGuideFor(
  scenarioDir: string,
  offerFile: string,
): Promise<GuideSection> {
  const sections = await readGuide(scenarioDir);
  const section = sections.find((s) => s.offerFile === offerFile);
  if (!section) {
    throw new Error(
      `la guia de ${scenarioDir} no tiene seccion para ${offerFile}. ` +
        `Secciones: ${sections.map((s) => s.offerFile).join(', ')}`,
    );
  }
  return section;
}

/** Mapa linea-de-oferta -> item-solicitado esperado, para los casos matcheados. */
export function expectedMatches(section: GuideSection): Map<number, number> {
  const map = new Map<number, number>();
  for (const row of section.rows) {
    if (row.offerLineNo !== null && row.requisitionLineNo !== null) {
      map.set(row.offerLineNo, row.requisitionLineNo);
    }
  }
  return map;
}
