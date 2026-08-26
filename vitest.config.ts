import { defineConfig } from 'vitest/config';
import { loadEnvFiles } from './src/core/env.js';

// Los tests deciden si saltearse el de regresion mirando DATABASE_URL antes de
// que corra nada del pipeline, asi que el entorno se carga aca.
loadEnvFiles();

export default defineConfig({
  test: {
    env: { ...process.env } as Record<string, string>,
    // Los tests que tocan la base comparten la requisicion sembrada, asi que
    // los archivos no pueden correr en paralelo.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 180_000,
  },
});
