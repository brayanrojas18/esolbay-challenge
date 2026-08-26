import { generateObject, NoObjectGeneratedError } from 'ai';
import pLimit from 'p-limit';
import { config } from '../core/config.js';
import { log } from '../core/logger.js';
import {
  normalizeUnit,
  parseArgNumber,
  parseDescription,
  parseNotes,
  type Flag,
} from '../extract/normalize.js';
import { llmOfferItemsSchema, type ExtractedOfferItem, type ExtractionWarning } from '../extract/schemas.js';
import { languageModel, tokenCounts } from './client.js';

/**
 * Extraccion de las lineas de un PDF con el LLM, por lotes.
 *
 * En lotes porque 177 lineas en una sola llamada chocan contra el limite de
 * tokens de salida, y aun entrando la calidad se cae sobre el final: el modelo
 * empieza a saltear campos. De a 40 se mantiene confiable y ademas paralelizan.
 *
 * El precio se le pide como texto y lo convierte parseArgNumber. Un LLM
 * convirtiendo formato es-AR es una fuente silenciosa de errores.
 */

const SYSTEM_PROMPT = `Sos un asistente de un area de compras (procurement) argentina.
Recibis filas de texto extraidas de la tabla de una cotizacion de proveedor en PDF y las
convertis a datos estructurados.

Reglas:
- Transcribi, no interpretes. No corrijas, completes ni "mejores" ninguna descripcion.
- El precio unitario devolvelo TEXTUAL, tal cual figura, con sus puntos y comas.
  Ejemplo: si dice "2.839,20" devolve exactamente "2.839,20". NO lo conviertas a numero.
- La cantidad si es un numero entero o decimal simple.
- Si la columna Notas esta vacia, devolve null. No inventes notas.
- Respeta el numero de linea que trae cada fila.
- Devolve UNA entrada por cada fila recibida, ni una mas ni una menos.
- Las descripciones pueden traer marcadores como "Equivalente tecnico" al principio o
  "linea alternativa" al final: dejalos donde estan, se procesan despues.`;

export interface LlmExtractionOptions {
  readonly bodyLines: readonly string[];
  readonly batchSize: number;
  readonly concurrency: number;
}

export interface LlmExtractionOutcome {
  readonly items: readonly ExtractedOfferItem[];
  readonly warnings: readonly ExtractionWarning[];
  readonly modelUsed: string;
  readonly calls: number;
  readonly batches: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
}

export async function extractOfferItemsWithLlm({
  bodyLines,
  batchSize,
  concurrency,
}: LlmExtractionOptions): Promise<LlmExtractionOutcome> {
  const batches: string[][] = [];
  for (let i = 0; i < bodyLines.length; i += batchSize) {
    batches.push(bodyLines.slice(i, i + batchSize) as string[]);
  }

  const limit = pLimit(concurrency);
  const warnings: ExtractionWarning[] = [];
  let calls = 0;
  let inputTokens = 0;
  let outputTokens = 0;

  log.info('extrayendo lineas con el LLM', {
    lineas: bodyLines.length,
    lotes: batches.length,
    tamanioLote: batchSize,
    concurrencia: concurrency,
  });

  const results = await Promise.all(
    batches.map((batch, index) =>
      limit(async () => {
        const outcome = await runBatch(batch, index, warnings);
        calls += outcome.calls;
        inputTokens += outcome.inputTokens;
        outputTokens += outcome.outputTokens;
        return outcome.items;
      }),
    ),
  );

  const items: ExtractedOfferItem[] = [];
  const seen = new Set<number>();

  for (const batchItems of results) {
    for (const item of batchItems) {
      if (seen.has(item.lineNo)) {
        warnings.push({
          code: 'duplicate_line',
          message: `el LLM devolvio la linea ${item.lineNo} mas de una vez; se conserva la primera`,
          lineNo: item.lineNo,
        });
        continue;
      }
      seen.add(item.lineNo);
      items.push(item);
    }
  }

  return {
    items,
    warnings,
    modelUsed: config().llmModel,
    calls,
    batches: batches.length,
    inputTokens,
    outputTokens,
  };
}

interface BatchOutcome {
  items: ExtractedOfferItem[];
  calls: number;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Procesa un lote. Si la salida no valida contra el schema, reintenta una vez
 * pasandole el error como feedback. Si vuelve a fallar, el lote se pierde pero
 * la corrida sigue: una linea mala no puede tumbar la extraccion de 177.
 */
async function runBatch(
  batch: readonly string[],
  index: number,
  warnings: ExtractionWarning[],
): Promise<BatchOutcome> {
  const table = batch.join('\n');
  const basePrompt = `Convertí estas ${batch.length} filas de la cotizacion a datos estructurados.

Columnas, en orden: Linea | Codigo proveedor | Descripcion ofertada | Cantidad | Unidad | Precio unit. | Notas
La columna Notas puede estar ausente en una fila: en ese caso es null.

Filas:
${table}`;

  let calls = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let lastError: unknown;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const prompt =
      attempt === 1
        ? basePrompt
        : `${basePrompt}

Tu respuesta anterior fue rechazada por este error de validacion:
${errorText(lastError)}
Corregila y respetá el schema exactamente.`;

    try {
      const result = await generateObject({
        model: languageModel(),
        schema: llmOfferItemsSchema,
        schemaName: 'offer_items',
        schemaDescription: 'Lineas de una cotizacion de proveedor',
        system: SYSTEM_PROMPT,
        prompt,
        temperature: 0,
      });

      calls++;
      const usage = tokenCounts(result.usage);
      inputTokens += usage.inputTokens;
      outputTokens += usage.outputTokens;

      if (attempt === 2) {
        warnings.push({
          code: 'llm_retry',
          message: `el lote ${index + 1} necesito un reintento para validar contra el schema`,
          lineNo: null,
        });
      }

      const expected = batch.length;
      if (result.object.items.length !== expected) {
        warnings.push({
          code: 'llm_failed',
          message: `el lote ${index + 1} tenia ${expected} filas y el LLM devolvio ${result.object.items.length}`,
          lineNo: null,
        });
      }

      return {
        items: result.object.items.map((raw) => toExtractedItem(raw, warnings)),
        calls,
        inputTokens,
        outputTokens,
      };
    } catch (e) {
      lastError = e;
      calls++;
      if (NoObjectGeneratedError.isInstance(e)) {
        const usage = tokenCounts(e.usage ?? {});
        inputTokens += usage.inputTokens;
        outputTokens += usage.outputTokens;
      }
      log.warn(`lote ${index + 1}: intento ${attempt} fallido`, { error: errorText(e).slice(0, 160) });
    }
  }

  warnings.push({
    code: 'llm_failed',
    message:
      `el lote ${index + 1} (${batch.length} lineas) fallo dos veces y se descarto: ${errorText(lastError).slice(0, 200)}`,
    lineNo: null,
  });

  return { items: [], calls, inputTokens, outputTokens };
}

/**
 * Lleva la salida cruda del modelo a la estructura del dominio.
 * Aca es donde el precio textual se convierte con el parser testeado y donde
 * los marcadores de la descripcion se vuelven flags.
 */
function toExtractedItem(
  raw: {
    lineNo: number;
    supplierCode: string | null;
    offeredDescription: string;
    offeredQuantity: number;
    rawUnit: string | null;
    rawUnitPrice: string | null;
    rawNotes: string | null;
  },
  warnings: ExtractionWarning[],
): ExtractedOfferItem {
  const { description, flags: descriptionFlags } = parseDescription(raw.offeredDescription);

  const notes = parseNotes(raw.rawNotes);
  for (const unknownNote of notes.unrecognized) {
    warnings.push({
      code: 'unknown_note',
      message: `nota sin flag conocido en la linea ${raw.lineNo}: "${unknownNote}"`,
      lineNo: raw.lineNo,
    });
  }

  const unitOfMeasure = normalizeUnit(raw.rawUnit);
  if (raw.rawUnit && !unitOfMeasure) {
    warnings.push({
      code: 'unknown_unit',
      message: `unidad no reconocida en la linea ${raw.lineNo}: "${raw.rawUnit}"`,
      lineNo: raw.lineNo,
    });
  }

  let unitPrice: number | null = null;
  try {
    unitPrice = parseArgNumber(raw.rawUnitPrice);
  } catch {
    warnings.push({
      code: 'missing_price',
      message: `precio ilegible en la linea ${raw.lineNo}: "${raw.rawUnitPrice}"`,
      lineNo: raw.lineNo,
    });
  }

  const flags = new Set<Flag>([...descriptionFlags, ...notes.flags]);

  return {
    lineNo: raw.lineNo,
    supplierCode: raw.supplierCode?.trim() || null,
    offeredDescription: description,
    offeredQuantity: raw.offeredQuantity,
    unitOfMeasure,
    rawUnit: raw.rawUnit,
    unitPrice,
    rawNotes: raw.rawNotes?.trim() || null,
    flags: [...flags],
  };
}

function errorText(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  return String(e);
}
