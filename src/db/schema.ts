import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  vector,
} from 'drizzle-orm/pg-core';
import { config } from '../core/config.js';

/**
 * Se lee de la configuracion en vez de estar fija: cada proveedor de embeddings
 * devuelve distinta cantidad de dimensiones y la columna tiene que declararla.
 * La migracion sustituye el mismo valor en el SQL. Ver src/db/migrate.ts.
 */
const EMBEDDING_DIMENSIONS = config().embeddingDimensions;

/**
 * Modelo de datos.
 *
 * El vocabulario sigue el de la API publica de Esolbay y no el de los CSV:
 * `requisition` en vez de "purchase request", `provider` en vez de "supplier",
 * `item` como catalogo maestro.
 */

/* -------------------------------------------------------------------------- */
/* Catalogo y solicitudes                                                      */
/* -------------------------------------------------------------------------- */

export const providers = pgTable(
  'providers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    taxId: text('tax_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('providers_name_key').on(t.name)],
);

export const requisitions = pgTable(
  'requisitions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull(),
    title: text('title').notNull(),
    type: text('type'),
    sector: text('sector'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('requisitions_code_key').on(t.code)],
);

export const requisitionGroups = pgTable('requisition_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  requisitionId: uuid('requisition_id')
    .notNull()
    .references(() => requisitions.id, { onDelete: 'cascade' }),
  name: text('name'),
  /** 'pickup' | 'delivery' */
  deliveryMethod: text('delivery_method'),
  addressId: text('address_id'),
});

/**
 * Catalogo maestro de items. Es lo que hace posible el aprendizaje por alias:
 * el codigo del proveedor se ata a un item del catalogo, no a una linea suelta
 * de una requisicion puntual.
 */
export const items = pgTable(
  'items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code'),
    name: text('name').notNull(),
    description: text('description'),
    unitOfMeasure: text('unit_of_measure'),
    brand: text('brand'),
    material: text('material'),
    certification: text('certification'),
    type: text('type'),
    attributes: jsonb('attributes'),
    embedding: vector('embedding', { dimensions: EMBEDDING_DIMENSIONS }),
  },
  (t) => [
    index('items_embedding_idx').using('hnsw', t.embedding.op('vector_cosine_ops')),
    unique('items_code_key').on(t.code),
  ],
);

export const requisitionItems = pgTable(
  'requisition_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requisitionId: uuid('requisition_id')
      .notNull()
      .references(() => requisitions.id, { onDelete: 'cascade' }),
    groupId: uuid('group_id').references(() => requisitionGroups.id, { onDelete: 'set null' }),
    itemId: uuid('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'restrict' }),
    lineNo: integer('line_no').notNull(),
    quantity: numeric('quantity', { precision: 14, scale: 3 }).notNull(),
    unitOfMeasure: text('unit_of_measure'),
    /** Unidad tal cual venia en el CSV. */
    rawUnit: text('raw_unit'),
    /** Texto original del CSV: la fuente de verdad para trazabilidad. */
    rawDescription: text('raw_description').notNull(),
    embedding: vector('embedding', { dimensions: EMBEDDING_DIMENSIONS }),
  },
  (t) => [
    index('requisition_items_embedding_idx').using('hnsw', t.embedding.op('vector_cosine_ops')),
    index('requisition_items_requisition_idx').on(t.requisitionId),
    unique('requisition_items_line_key').on(t.requisitionId, t.lineNo),
  ],
);

/* -------------------------------------------------------------------------- */
/* Ofertas                                                                     */
/* -------------------------------------------------------------------------- */

export const offers = pgTable(
  'offers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => providers.id, { onDelete: 'restrict' }),
    requisitionId: uuid('requisition_id')
      .notNull()
      .references(() => requisitions.id, { onDelete: 'cascade' }),
    quoteCode: text('quote_code'),
    quoteDate: text('quote_date'),
    terms: text('terms'),
    sourceFilename: text('source_filename').notNull(),
    /** 'pdf' | 'xlsx' */
    sourceFormat: text('source_format').notNull(),
    /** SHA-256 del archivo: base de la idempotencia del reproceso. */
    sourceHash: text('source_hash').notNull(),
    currency: text('currency'),
    status: text('status').notNull().default('extracted'),
    /** Modelo, tokens, lotes y warnings de la extraccion. */
    extractionMeta: jsonb('extraction_meta'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('offers_requisition_idx').on(t.requisitionId),
    // Reprocesar el mismo archivo contra la misma requisicion actualiza en vez
    // de duplicar.
    unique('offers_source_key').on(t.requisitionId, t.sourceHash),
  ],
);

export const offerItems = pgTable(
  'offer_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    offerId: uuid('offer_id')
      .notNull()
      .references(() => offers.id, { onDelete: 'cascade' }),
    lineNo: integer('line_no').notNull(),
    supplierCode: text('supplier_code'),
    offeredDescription: text('offered_description').notNull(),
    offeredQuantity: numeric('offered_quantity', { precision: 14, scale: 3 }).notNull(),
    unitOfMeasure: text('unit_of_measure'),
    rawUnit: text('raw_unit'),
    unitPrice: numeric('unit_price', { precision: 14, scale: 4 }),
    rawNotes: text('raw_notes'),
    flags: text('flags').array().notNull().default(sql`ARRAY[]::text[]`),
    embedding: vector('embedding', { dimensions: EMBEDDING_DIMENSIONS }),
  },
  (t) => [
    index('offer_items_embedding_idx').using('hnsw', t.embedding.op('vector_cosine_ops')),
    index('offer_items_offer_idx').on(t.offerId),
    unique('offer_items_line_key').on(t.offerId, t.lineNo),
  ],
);

/* -------------------------------------------------------------------------- */
/* Conciliacion                                                                */
/* -------------------------------------------------------------------------- */

export const reconciliations = pgTable(
  'reconciliations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    offerId: uuid('offer_id')
      .notNull()
      .references(() => offers.id, { onDelete: 'cascade' }),
    requisitionId: uuid('requisition_id')
      .notNull()
      .references(() => requisitions.id, { onDelete: 'cascade' }),
    strategyVersion: text('strategy_version').notNull(),
    modelUsed: text('model_used'),
    summary: jsonb('summary'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('reconciliations_offer_idx').on(t.offerId)],
);

export const reconciliationLines = pgTable(
  'reconciliation_lines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reconciliationId: uuid('reconciliation_id')
      .notNull()
      .references(() => reconciliations.id, { onDelete: 'cascade' }),
    /** null cuando la linea ofertada no corresponde a nada pedido (extra). */
    requisitionItemId: uuid('requisition_item_id').references(() => requisitionItems.id, {
      onDelete: 'cascade',
    }),
    /** null cuando el item pedido no fue cotizado (missing_from_offer). */
    offerItemId: uuid('offer_item_id').references(() => offerItems.id, { onDelete: 'cascade' }),
    status: text('status').notNull(),
    confidence: numeric('confidence', { precision: 3, scale: 2 }).notNull(),
    quantityDelta: numeric('quantity_delta', { precision: 14, scale: 3 }),
    priceTotal: numeric('price_total', { precision: 16, scale: 4 }),
    /** POR QUE se decidio esto. Obligatorio: es el nucleo de la trazabilidad. */
    reasoning: text('reasoning').notNull(),
    /** Top-K candidatos evaluados con su score. */
    candidates: jsonb('candidates'),
    needsReview: boolean('needs_review').notNull().default(false),
    /** 'exact_code' | 'alias' | 'vector+llm' | 'llm' | 'unmatched' | 'lexical' */
    decidedBy: text('decided_by').notNull(),
  },
  (t) => [
    index('reconciliation_lines_reconciliation_idx').on(t.reconciliationId),
    index('reconciliation_lines_status_idx').on(t.status),
  ],
);

/**
 * Aprendizaje por confirmacion: cada match que un comprador confirma ata el
 * codigo del proveedor a un item del catalogo. La proxima cotizacion de ese
 * proveedor matchea por codigo: instantanea, gratis y sin LLM.
 */
export const supplierItemAliases = pgTable(
  'supplier_item_aliases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => providers.id, { onDelete: 'cascade' }),
    supplierCode: text('supplier_code').notNull(),
    itemId: uuid('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }).notNull().defaultNow(),
    sourceReconciliationLineId: uuid('source_reconciliation_line_id').references(
      () => reconciliationLines.id,
      { onDelete: 'set null' },
    ),
  },
  (t) => [unique('supplier_item_aliases_key').on(t.providerId, t.supplierCode)],
);
