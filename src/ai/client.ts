import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import type { EmbeddingModel, LanguageModel } from 'ai';
import { config } from '../core/config.js';
import { ConfigError } from '../core/errors.js';

/**
 * Punto unico de acceso al proveedor de IA.
 *
 * El resto del codigo pide "el modelo de lenguaje" y no sabe quien esta del
 * otro lado. Cambiar de proveedor es tocar este archivo y una variable de
 * entorno: por eso se uso el AI SDK y no el cliente de cada proveedor.
 *
 * Hoy soporta OpenAI y Google. Sumar otro es agregar un caso al switch.
 */

type Provider =
  | { kind: 'openai'; client: ReturnType<typeof createOpenAI> }
  | { kind: 'google'; client: ReturnType<typeof createGoogleGenerativeAI> };

let cached: Provider | undefined;

function provider(): Provider {
  if (cached) return cached;

  const { provider: kind, apiKey } = config();

  if (!apiKey) {
    throw new ConfigError(
      `se intento llamar a la API de ${kind} sin credenciales. ` +
        `Corre el comando con --dry-run o completa la key en .env`,
      { proveedor: kind },
    );
  }

  cached =
    kind === 'google'
      ? { kind: 'google', client: createGoogleGenerativeAI({ apiKey }) }
      : { kind: 'openai', client: createOpenAI({ apiKey }) };

  return cached;
}

export function languageModel(): LanguageModel {
  const p = provider();
  return p.client(config().llmModel);
}

export function embeddingModel(): EmbeddingModel {
  const p = provider();
  return p.client.textEmbeddingModel(config().embeddingModel);
}

/**
 * Google deja elegir la dimension de salida, OpenAI la fija por modelo. Se le
 * pide la configurada para que los vectores entren en las columnas sin migrar
 * nada al cambiar de proveedor.
 */
export function embeddingProviderOptions():
  | Record<string, Record<string, number>>
  | undefined {
  const { provider: kind, embeddingDimensions } = config();
  if (kind !== 'google') return undefined;
  return { google: { outputDimensionality: embeddingDimensions } };
}

/** Solo para tests: fuerza la recreacion del cliente. */
export function resetAiClient(): void {
  cached = undefined;
}

/** Suma de tokens de una llamada, tolerante a proveedores que no los reportan. */
export function tokenCounts(usage: {
  inputTokens?: number | undefined;
  outputTokens?: number | undefined;
}): { inputTokens: number; outputTokens: number } {
  return {
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
  };
}
