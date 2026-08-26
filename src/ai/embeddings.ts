import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { embedMany } from 'ai';
import { config } from '../core/config.js';
import { log } from '../core/logger.js';
import { embeddingModel, embeddingProviderOptions } from './client.js';
import { localEmbedding } from './local-embeddings.js';

/**
 * Generacion de embeddings, con dos implementaciones detras de la misma firma.
 *
 * Decisiones:
 *  - Se batchea de a 100 textos por llamada, que es lo que soporta la API. Con
 *    622 textos entre las dos requisiciones y las cuatro ofertas, son 7 llamadas
 *    en vez de 622.
 *  - Se cachea por hash del texto en disco. Reprocesar la misma oferta no
 *    re-paga los embeddings, que es la diferencia entre iterar gratis y pagar
 *    cada vez que se corrige un bug del matcher.
 */

const CACHE_DIR = resolve(process.cwd(), '.cache');
const BATCH_SIZE = 100;

export interface EmbeddingOptions {
  /** No llama a la API: usa el baseline lexico local. */
  readonly dryRun: boolean;
}

export interface EmbeddingOutcome {
  readonly vectors: readonly (readonly number[])[];
  readonly provider: 'openai' | 'local';
  readonly model: string;
  readonly calls: number;
  readonly tokens: number;
  readonly cacheHits: number;
}

type Cache = Record<string, number[]>;

function cacheFile(model: string): string {
  // La dimension entra en el nombre: el mismo modelo con otra dimension de
  // salida produce vectores distintos y reusarlos daria resultados mudos.
  const slug = `${model}-${config().embeddingDimensions}`.replace(/[^a-z0-9-]/gi, '_');
  return resolve(CACHE_DIR, `embeddings-${slug}.json`);
}

async function loadCache(model: string): Promise<Cache> {
  try {
    return JSON.parse(await readFile(cacheFile(model), 'utf8')) as Cache;
  } catch {
    return {};
  }
}

async function saveCache(model: string, cache: Cache): Promise<void> {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(cacheFile(model), JSON.stringify(cache), 'utf8');
  } catch (e) {
    log.warn('no se pudo escribir el cache de embeddings', {
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

function keyOf(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 32);
}

export async function embedTexts(
  texts: readonly string[],
  { dryRun }: EmbeddingOptions,
): Promise<EmbeddingOutcome> {
  const model = dryRun ? 'local-lexical-v1' : config().embeddingModel;

  if (texts.length === 0) {
    return { vectors: [], provider: dryRun ? 'local' : 'openai', model, calls: 0, tokens: 0, cacheHits: 0 };
  }

  if (dryRun) {
    // El baseline local es puro calculo: cachearlo no ahorra nada.
    return {
      vectors: texts.map(localEmbedding),
      provider: 'local',
      model,
      calls: 0,
      tokens: 0,
      cacheHits: 0,
    };
  }

  const cache = await loadCache(model);
  const vectors = new Array<readonly number[] | undefined>(texts.length);
  const pending: { index: number; text: string; key: string }[] = [];

  texts.forEach((text, index) => {
    const key = keyOf(text);
    const cached = cache[key];
    if (cached) vectors[index] = cached;
    else pending.push({ index, text, key });
  });

  const cacheHits = texts.length - pending.length;
  let calls = 0;
  let tokens = 0;

  if (pending.length > 0) {
    log.info('generando embeddings', {
      total: texts.length,
      enCache: cacheHits,
      aPedir: pending.length,
      lotes: Math.ceil(pending.length / BATCH_SIZE),
    });

    for (let start = 0; start < pending.length; start += BATCH_SIZE) {
      const batch = pending.slice(start, start + BATCH_SIZE);
      const providerOptions = embeddingProviderOptions();
      const result = await embedMany({
        model: embeddingModel(),
        values: batch.map((p) => p.text),
        ...(providerOptions ? { providerOptions } : {}),
      });

      calls++;
      // No todos los proveedores reportan tokens en embeddings: Google devuelve
      // el campo vacio. Sin este guard el contador se vuelve NaN y contamina el
      // reporte de trazabilidad.
      const reported = result.usage?.tokens;
      if (typeof reported === 'number' && Number.isFinite(reported)) tokens += reported;

      result.embeddings.forEach((vector, i) => {
        const entry = batch[i]!;
        if (vector.length !== config().embeddingDimensions) {
          throw new Error(
            `el modelo ${model} devolvio ${vector.length} dimensiones y la base espera ` +
              `${config().embeddingDimensions}. Ajusta EMBEDDING_DIMENSIONS y volve a migrar, ` +
              `o usa un modelo compatible`,
          );
        }
        vectors[entry.index] = vector;
        cache[entry.key] = vector;
      });
    }

    await saveCache(model, cache);
  } else {
    log.info('embeddings resueltos por cache', { total: texts.length });
  }

  return {
    vectors: vectors.map((v, i) => {
      if (!v) throw new Error(`no se genero embedding para el texto ${i}`);
      return v;
    }),
    provider: 'openai',
    model,
    calls,
    tokens,
    cacheHits,
  };
}

/** Formato que espera pgvector en un INSERT: '[0.1,0.2,...]'. */
export function toPgVector(vector: readonly number[]): string {
  return `[${vector.join(',')}]`;
}
