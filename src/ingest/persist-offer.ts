import { eq, sql } from 'drizzle-orm';
import { embedTexts, toPgVector } from '../ai/embeddings.js';
import { ExtractionError } from '../core/errors.js';
import { log } from '../core/logger.js';
import { db, schema, sqlConnection } from '../db/client.js';
import { embeddingText } from '../extract/normalize.js';
import type { ExtractedOffer } from '../extract/schemas.js';

/**
 * Persistencia de una oferta extraida, con sus embeddings.
 *
 * Extraccion y conciliacion son etapas independientes y re-ejecutables: esta
 * funcion cierra la primera. Guardar antes de conciliar significa que un bug
 * del matcher no obliga a re-extraer (ni a re-pagar el PDF).
 *
 * Idempotencia: la clave es (requisition_id, source_hash). Reprocesar el mismo
 * archivo actualiza la cabecera y reemplaza las lineas, no duplica la oferta.
 */

export interface PersistResult {
  readonly offerId: string;
  readonly providerId: string;
  readonly itemCount: number;
  readonly reused: boolean;
  readonly embeddingProvider: 'openai' | 'local';
  readonly embeddingModel: string;
  readonly embeddingCalls: number;
  readonly embeddingTokens: number;
  readonly embeddingCacheHits: number;
}

export async function persistOffer(
  offer: ExtractedOffer,
  requisitionCode: string,
  options: { dryRun: boolean },
): Promise<PersistResult> {
  const database = db();

  const requisition = await database.query.requisitions.findFirst({
    where: eq(schema.requisitions.code, requisitionCode),
    columns: { id: true },
  });

  if (!requisition) {
    throw new ExtractionError(
      `no existe la requisicion ${requisitionCode}. Corre "npm run seed" primero`,
      { code: requisitionCode },
    );
  }

  const [provider] = await database
    .insert(schema.providers)
    .values({ name: offer.header.providerName })
    .onConflictDoUpdate({
      target: schema.providers.name,
      // No hay nada que actualizar, pero onConflictDoUpdate es lo que permite
      // recuperar el id de la fila existente en un solo viaje.
      set: { name: sql`excluded.name` },
    })
    .returning({ id: schema.providers.id });

  if (!provider) throw new ExtractionError('no se pudo registrar el proveedor');

  const existing = await database.query.offers.findFirst({
    where: (o, { and, eq: equals }) =>
      and(equals(o.requisitionId, requisition.id), equals(o.sourceHash, offer.meta.sourceHash)),
    columns: { id: true },
  });

  const [saved] = await database
    .insert(schema.offers)
    .values({
      providerId: provider.id,
      requisitionId: requisition.id,
      quoteCode: offer.header.quoteCode,
      quoteDate: offer.header.quoteDate,
      terms: offer.header.terms,
      sourceFilename: offer.meta.sourceFilename,
      sourceFormat: offer.meta.sourceFormat,
      sourceHash: offer.meta.sourceHash,
      currency: offer.header.currency,
      status: 'extracted',
      extractionMeta: offer.meta,
    })
    .onConflictDoUpdate({
      target: [schema.offers.requisitionId, schema.offers.sourceHash],
      set: {
        quoteCode: sql`excluded.quote_code`,
        quoteDate: sql`excluded.quote_date`,
        terms: sql`excluded.terms`,
        extractionMeta: sql`excluded.extraction_meta`,
        status: sql`excluded.status`,
      },
    })
    .returning({ id: schema.offers.id });

  if (!saved) throw new ExtractionError('no se pudo guardar la oferta');

  // Reemplazo total de las lineas: es mas simple y mas seguro que intentar un
  // diff linea por linea, y el volumen (225 filas) lo permite sin costo real.
  await database.delete(schema.offerItems).where(eq(schema.offerItems.offerId, saved.id));

  const texts = offer.items.map((item) => embeddingText(item.offeredDescription, item.unitOfMeasure));
  const embeddings = await embedTexts(texts, { dryRun: options.dryRun });

  const rows = offer.items.map((item, index) => ({
    offerId: saved.id,
    lineNo: item.lineNo,
    supplierCode: item.supplierCode,
    offeredDescription: item.offeredDescription,
    offeredQuantity: String(item.offeredQuantity),
    unitOfMeasure: item.unitOfMeasure,
    rawUnit: item.rawUnit,
    unitPrice: item.unitPrice === null ? null : String(item.unitPrice),
    rawNotes: item.rawNotes,
    flags: [...item.flags],
    embedding: embeddings.vectors[index] as number[] | undefined,
  }));

  const BATCH = 50;
  for (let start = 0; start < rows.length; start += BATCH) {
    await database.insert(schema.offerItems).values(rows.slice(start, start + BATCH));
  }

  log.info('oferta persistida', {
    oferta: saved.id,
    lineas: rows.length,
    reprocesada: existing ? 1 : 0,
  });

  return {
    offerId: saved.id,
    providerId: provider.id,
    itemCount: rows.length,
    reused: existing !== undefined,
    embeddingProvider: embeddings.provider,
    embeddingModel: embeddings.model,
    embeddingCalls: embeddings.calls,
    embeddingTokens: embeddings.tokens,
    embeddingCacheHits: embeddings.cacheHits,
  };
}

/**
 * Genera los embeddings de los items solicitados que todavia no los tienen.
 *
 * Se hace una sola vez por requisicion y modelo: 220 items no cambian entre
 * corridas. Si se cambia de proveedor de embeddings hay que forzar el refresco,
 * porque los vectores de dos modelos distintos no son comparables entre si.
 */
export async function ensureRequisitionEmbeddings(
  requisitionCode: string,
  options: { dryRun: boolean; force?: boolean },
): Promise<{ generated: number; total: number; provider: string; model: string }> {
  const database = db();
  const sqlc = sqlConnection();

  const requisition = await database.query.requisitions.findFirst({
    where: eq(schema.requisitions.code, requisitionCode),
    columns: { id: true },
  });

  if (!requisition) {
    throw new ExtractionError(`no existe la requisicion ${requisitionCode}`, {
      code: requisitionCode,
    });
  }

  const pending = await sqlc<
    { id: string; raw_description: string; unit_of_measure: string | null }[]
  >`
    SELECT id, raw_description, unit_of_measure
    FROM requisition_items
    WHERE requisition_id = ${requisition.id}
      ${options.force ? sqlc`` : sqlc`AND embedding IS NULL`}
    ORDER BY line_no
  `;

  const total = await sqlc<{ count: number }[]>`
    SELECT count(*)::int AS count FROM requisition_items WHERE requisition_id = ${requisition.id}
  `;

  if (pending.length === 0) {
    return {
      generated: 0,
      total: total[0]?.count ?? 0,
      provider: options.dryRun ? 'local' : 'openai',
      model: '-',
    };
  }

  const texts = pending.map((row) =>
    embeddingText(row.raw_description, row.unit_of_measure as never),
  );
  const embeddings = await embedTexts(texts, { dryRun: options.dryRun });

  // Un UPDATE por item son 220 round-trips a Supabase: mas de dos minutos de
  // pura latencia de red. Con unnest se resuelven de a 25 en un solo statement.
  const UPDATE_BATCH = 25;
  for (let start = 0; start < pending.length; start += UPDATE_BATCH) {
    const slice = pending.slice(start, start + UPDATE_BATCH);
    const ids: string[] = [];
    const vectors: string[] = [];

    slice.forEach((row, i) => {
      const vector = embeddings.vectors[start + i];
      if (!vector) return;
      ids.push(row.id);
      vectors.push(toPgVector(vector));
    });

    if (ids.length === 0) continue;

    await sqlc`
      UPDATE requisition_items ri
      SET embedding = d.embedding::vector
      FROM unnest(${ids}::uuid[], ${vectors}::text[]) AS d(id, embedding)
      WHERE ri.id = d.id
    `;
  }

  return {
    generated: pending.length,
    total: total[0]?.count ?? 0,
    provider: embeddings.provider,
    model: embeddings.model,
  };
}
