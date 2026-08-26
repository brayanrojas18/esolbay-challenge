import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { ExtractionError } from '../core/errors.js';
import { log } from '../core/logger.js';
import { db, schema } from '../db/client.js';
import { normalizeUnit, parseArgNumber } from '../extract/normalize.js';

/**
 * Carga inicial de la base a partir de los CSV.
 *
 * Vive aparte del pipeline porque el enunciado aclara que importar los CSV no
 * tiene que ser una funcionalidad de la app. Es idempotente: correrlo dos veces
 * no duplica nada.
 */

const requestRow = z.object({
  request_id: z.string().min(1),
  title: z.string().min(1),
});

const itemRow = z.object({
  request_id: z.string().min(1),
  item_id: z.string().min(1),
  description: z.string().min(1),
  quantity: z.string().min(1),
  unit: z.string().min(1),
});

export interface SeedResult {
  readonly requisitionCode: string;
  readonly requisitionId: string;
  readonly itemsInserted: number;
  readonly itemsUpdated: number;
  readonly catalogItems: number;
}

async function readCsv<T>(path: string, schema_: z.ZodType<T>): Promise<T[]> {
  const raw = await readFile(path, 'utf8');
  const records: unknown[] = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });

  return records.map((record, index) => {
    const parsed = schema_.safeParse(record);
    if (!parsed.success) {
      throw new ExtractionError('fila de CSV invalida', {
        archivo: path,
        fila: index + 2, // +1 por el header, +1 porque los humanos cuentan desde 1
        detalle: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      });
    }
    return parsed.data;
  });
}

/**
 * Carga un escenario completo.
 *
 * Cada linea del CSV genera dos registros: uno en `items` (catalogo maestro) y
 * otro en `requisition_items`. Esa separacion es la que permite que un alias de
 * proveedor sobreviva a la compra.
 */
export async function seedScenario(scenarioDir: string): Promise<SeedResult> {
  const requests = await readCsv(resolve(scenarioDir, 'purchase_requests.csv'), requestRow);
  const items = await readCsv(resolve(scenarioDir, 'purchase_request_items.csv'), itemRow);

  const request = requests[0];
  if (!request) throw new ExtractionError('purchase_requests.csv esta vacio', { dir: scenarioDir });
  if (requests.length > 1) {
    log.warn('el CSV trae mas de una solicitud; se carga la primera', {
      encontradas: requests.length,
    });
  }

  const database = db();

  const [requisition] = await database
    .insert(schema.requisitions)
    .values({ code: request.request_id, title: request.title })
    .onConflictDoUpdate({
      target: schema.requisitions.code,
      set: { title: request.title },
    })
    .returning({ id: schema.requisitions.id });

  if (!requisition) throw new ExtractionError('no se pudo crear la requisicion');

  const scoped = items.filter((i) => i.request_id === request.request_id);
  if (scoped.length !== items.length) {
    log.warn('hay items de otra solicitud en el CSV; se ignoran', {
      ignorados: items.length - scoped.length,
    });
  }

  let itemsInserted = 0;
  let catalogItems = 0;

  // Se insertan de a lotes: 220 round-trips individuales contra Supabase son
  // varios segundos de latencia de red por nada.
  const BATCH = 50;
  for (let start = 0; start < scoped.length; start += BATCH) {
    const batch = scoped.slice(start, start + BATCH);

    const catalogRows = batch.map((row) => ({
      code: `${request.request_id}-${row.item_id}`,
      name: row.description,
      unitOfMeasure: normalizeUnit(row.unit),
    }));

    const catalog = await database
      .insert(schema.items)
      .values(catalogRows)
      .onConflictDoUpdate({
        target: schema.items.code,
        set: { name: sql`excluded.name`, unitOfMeasure: sql`excluded.unit_of_measure` },
      })
      .returning({ id: schema.items.id, code: schema.items.code });

    catalogItems += catalog.length;
    const catalogByCode = new Map(catalog.map((c) => [c.code, c.id]));

    const requisitionRows = batch.map((row) => {
      const code = `${request.request_id}-${row.item_id}`;
      const itemId = catalogByCode.get(code);
      if (!itemId) throw new ExtractionError('no se pudo resolver el item del catalogo', { code });

      const quantity = parseArgNumber(row.quantity);
      if (quantity === null) {
        throw new ExtractionError('item sin cantidad', { code, valor: row.quantity });
      }

      return {
        requisitionId: requisition.id,
        itemId,
        lineNo: Number(row.item_id),
        quantity: String(quantity),
        unitOfMeasure: normalizeUnit(row.unit),
        rawUnit: row.unit,
        rawDescription: row.description,
      };
    });

    const inserted = await database
      .insert(schema.requisitionItems)
      .values(requisitionRows)
      .onConflictDoUpdate({
        target: [schema.requisitionItems.requisitionId, schema.requisitionItems.lineNo],
        set: {
          quantity: sql`excluded.quantity`,
          unitOfMeasure: sql`excluded.unit_of_measure`,
          rawUnit: sql`excluded.raw_unit`,
          rawDescription: sql`excluded.raw_description`,
        },
      })
      .returning({ id: schema.requisitionItems.id });

    itemsInserted += inserted.length;
  }

  return {
    requisitionCode: request.request_id,
    requisitionId: requisition.id,
    itemsInserted,
    itemsUpdated: 0,
    catalogItems,
  };
}
