import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Carga el .env para los tests.
 *
 * El test de regresion necesita DATABASE_URL; el resto de la suite (parsers,
 * normalizacion, lector de la guia) corre igual sin ella. Si no hay .env, esos
 * tests se saltean en vez de fallar, asi la suite sirve tambien en CI sin
 * credenciales.
 */
function loadDotEnv(): Record<string, string> {
  try {
    const raw = readFileSync(resolve(import.meta.dirname, '.env'), 'utf8');
    const env: Record<string, string> = {};

    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 0) continue;
      const value = trimmed.slice(eq + 1).trim();
      if (value) env[trimmed.slice(0, eq).trim()] = value;
    }

    return env;
  } catch {
    return {};
  }
}

export default defineConfig({
  test: {
    env: loadDotEnv(),
    // Los tests que tocan la base comparten estado (una sola requisicion
    // sembrada), asi que los archivos no pueden correr en paralelo.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 180_000,
  },
});
