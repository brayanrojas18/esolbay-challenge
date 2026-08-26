import { z } from 'zod';
import { FLAGS, UNITS } from './normalize.js';

/**
 * Contrato unico de extraccion.
 *
 * PDF y XLSX van por caminos distintos pero terminan en esta misma estructura.
 * Todo lo que sigue trabaja contra esto y no sabe de que formato salio.
 */

export const unitSchema = z.enum(UNITS);
export const flagSchema = z.enum(FLAGS);

export const extractedOfferItemSchema = z.object({
  /** Numero de linea tal como lo numera el proveedor. */
  lineNo: z.number().int().positive(),
  /** Codigo del catalogo del proveedor (ej. "SIP-00110"). */
  supplierCode: z.string().trim().min(1).nullable(),
  /** Descripcion ya limpia de marcadores, lista para embeber. */
  offeredDescription: z.string().trim().min(1),
  offeredQuantity: z.number().nonnegative(),
  unitOfMeasure: unitSchema.nullable(),
  /** Unidad tal cual la escribio el proveedor, para trazabilidad. */
  rawUnit: z.string().nullable(),
  unitPrice: z.number().nonnegative().nullable(),
  /** Texto crudo de la columna Notas. */
  rawNotes: z.string().nullable(),
  flags: z.array(flagSchema),
});

export type ExtractedOfferItem = z.infer<typeof extractedOfferItemSchema>;

export const extractedOfferHeaderSchema = z.object({
  providerName: z.string().trim().min(1),
  quoteCode: z.string().trim().min(1).nullable(),
  /** ISO 8601 (YYYY-MM-DD). */
  quoteDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  terms: z.string().trim().nullable(),
  currency: z.string().trim().nullable(),
});

export type ExtractedOfferHeader = z.infer<typeof extractedOfferHeaderSchema>;

/** Aviso no fatal: la corrida sigue, pero el comprador tiene que saberlo. */
export const extractionWarningSchema = z.object({
  code: z.enum([
    'line_gap',            // huecos en la numeracion de lineas
    'duplicate_line',      // dos lineas con el mismo numero
    'unknown_unit',        // unidad fuera del vocabulario conocido
    'unknown_note',        // nota que no mapeo a ningun flag
    'missing_price',       // linea sin precio
    'llm_retry',           // la salida del LLM no valido y se reintento
    'llm_failed',          // la salida del LLM fallo dos veces
    'header_fallback',     // no se pudo leer la cabecera, se uso el nombre del archivo
  ]),
  message: z.string(),
  lineNo: z.number().int().nullable(),
});

export type ExtractionWarning = z.infer<typeof extractionWarningSchema>;

/** Metricas de la extraccion, para la seccion de trazabilidad del reporte. */
export const extractionMetaSchema = z.object({
  sourceFormat: z.enum(['pdf', 'xlsx']),
  sourceFilename: z.string(),
  /** SHA-256 del archivo: base de la idempotencia. */
  sourceHash: z.string(),
  strategy: z.enum(['deterministic', 'llm', 'llm+deterministic']),
  modelUsed: z.string().nullable(),
  llmCalls: z.number().int().nonnegative(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  batches: z.number().int().nonnegative(),
  durationMs: z.number().nonnegative(),
  warnings: z.array(extractionWarningSchema),
});

export type ExtractionMeta = z.infer<typeof extractionMetaSchema>;

export const extractedOfferSchema = z.object({
  header: extractedOfferHeaderSchema,
  items: z.array(extractedOfferItemSchema),
  meta: extractionMetaSchema,
});

export type ExtractedOffer = z.infer<typeof extractedOfferSchema>;

/** Schema que se le pide al LLM por lote: solo las lineas, sin metadatos. */
export const llmOfferItemsSchema = z.object({
  items: z.array(
    z.object({
      lineNo: z.number().int().positive().describe('Numero de la columna "Linea"'),
      supplierCode: z.string().nullable().describe('Codigo del proveedor, ej. MIS-00110'),
      offeredDescription: z.string().describe('Descripcion ofertada, textual y completa'),
      offeredQuantity: z.number().describe('Cantidad ofertada'),
      rawUnit: z.string().nullable().describe('Unidad tal cual figura, ej. unidad, metro, rollo'),
      rawUnitPrice: z
        .string()
        .nullable()
        .describe('Precio unitario TEXTUAL, sin convertir. Ej: "2.839,20"'),
      rawNotes: z.string().nullable().describe('Contenido de la columna Notas, o null si esta vacia'),
    }),
  ),
});

export type LlmOfferItems = z.infer<typeof llmOfferItemsSchema>;

/** Schema de la cabecera cuando la extrae el LLM. */
export const llmOfferHeaderSchema = z.object({
  providerName: z.string().describe('Razon social del proveedor'),
  quoteCode: z.string().nullable().describe('Codigo de cotizacion, ej. COT-MIS-2026-407'),
  quoteDate: z.string().nullable().describe('Fecha en formato YYYY-MM-DD'),
  terms: z.string().nullable().describe('Condiciones comerciales, textual'),
});
