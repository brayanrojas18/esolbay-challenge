import { z } from 'zod';
import { ConfigError } from './errors.js';
import { loadEnvFiles } from './env.js';

/**
 * Configuracion del proceso, validada una sola vez al arrancar.
 *
 * Las credenciales son opcionales a proposito: sin ninguna, el pipeline corre
 * igual con los proveedores locales (--dry-run).
 */

export const AI_PROVIDERS = ['openai', 'google'] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

/** Defaults por proveedor, para no obligar a configurar modelos a mano. */
const DEFAULTS: Record<AiProvider, { llm: string; embedding: string; dimensions: number }> = {
  openai: {
    llm: 'gpt-4o-mini',
    embedding: 'text-embedding-3-small',
    dimensions: 1536,
  },
  google: {
    llm: 'gemini-3.6-flash',
    // gemini-embedding-001 admite outputDimensionality, asi que se le piden las
    // mismas 1536 dimensiones que usa OpenAI. Eso evita tener que migrar las
    // columnas vector() al cambiar de proveedor.
    embedding: 'gemini-embedding-001',
    dimensions: 1536,
  },
};

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  AI_PROVIDER: z.enum(AI_PROVIDERS).default('openai'),
  OPENAI_API_KEY: z.string().trim().min(1).optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().trim().min(1).optional(),
  LLM_MODEL: z.string().trim().min(1).optional(),
  EMBEDDING_MODEL: z.string().trim().min(1).optional(),
  EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().optional(),
});

export interface Config {
  readonly databaseUrl: string | undefined;
  readonly provider: AiProvider;
  readonly apiKey: string | undefined;
  readonly llmModel: string;
  readonly embeddingModel: string;
  /**
   * Dimensiones del vector. Tiene que coincidir con las columnas vector() de
   * la base: vectores de dos modelos distintos NO son comparables entre si.
   */
  readonly embeddingDimensions: number;
}

let cached: Config | undefined;

export function config(): Config {
  if (cached) return cached;
  loadEnvFiles();

  const parsed = envSchema.safeParse({
    DATABASE_URL: process.env['DATABASE_URL'],
    AI_PROVIDER: process.env['AI_PROVIDER'] || undefined,
    // Una key vacia en el .env equivale a no tenerla.
    OPENAI_API_KEY: process.env['OPENAI_API_KEY'] || undefined,
    GOOGLE_GENERATIVE_AI_API_KEY: process.env['GOOGLE_GENERATIVE_AI_API_KEY'] || undefined,
    LLM_MODEL: process.env['LLM_MODEL'] || undefined,
    EMBEDDING_MODEL: process.env['EMBEDDING_MODEL'] || undefined,
    EMBEDDING_DIMENSIONS: process.env['EMBEDDING_DIMENSIONS'] || undefined,
  });

  if (!parsed.success) {
    throw new ConfigError('variables de entorno invalidas', {
      detalle: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    });
  }

  const env = parsed.data;

  // Si no se declaro proveedor pero hay una sola key, se infiere. Evita que
  // alguien pegue la key de Google y no entienda por que sigue pidiendo OpenAI.
  let provider = env.AI_PROVIDER;
  if (!process.env['AI_PROVIDER']) {
    if (!env.OPENAI_API_KEY && env.GOOGLE_GENERATIVE_AI_API_KEY) provider = 'google';
  }

  const defaults = DEFAULTS[provider];

  cached = {
    databaseUrl: env.DATABASE_URL,
    provider,
    apiKey: provider === 'google' ? env.GOOGLE_GENERATIVE_AI_API_KEY : env.OPENAI_API_KEY,
    llmModel: env.LLM_MODEL ?? defaults.llm,
    embeddingModel: env.EMBEDDING_MODEL ?? defaults.embedding,
    embeddingDimensions: env.EMBEDDING_DIMENSIONS ?? defaults.dimensions,
  };

  return cached;
}

/** Solo para tests: fuerza la relectura del entorno. */
export function resetConfig(): void {
  cached = undefined;
}

/** Falla con un mensaje accionable si no hay DB configurada. */
export function requireDatabaseUrl(): string {
  const url = config().databaseUrl;
  if (!url) {
    throw new ConfigError(
      'falta DATABASE_URL. Copia .env.example a .env y completa la connection string',
    );
  }
  return url;
}

/** True si hay credenciales para llamar a la API del proveedor configurado. */
export function hasAiCredentials(): boolean {
  return config().apiKey !== undefined;
}

/** Nombre legible del proveedor, para logs y reportes. */
export function providerLabel(): string {
  const { provider, llmModel, embeddingModel } = config();
  return `${provider} (${llmModel} / ${embeddingModel})`;
}
