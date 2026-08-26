import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Carga el entorno desde archivos, sin dependencias.
 *
 * Prioridad: lo que ya este en process.env, despues .env, y por ultimo
 * .env.demo. El orden de lectura es ese porque una clave definida no se pisa.
 */
const FILES = ['.env', '.env.demo'] as const;

let loaded = false;

export function loadEnvFiles(cwd = process.cwd()): void {
  if (loaded) return;
  loaded = true;

  for (const file of FILES) {
    let raw: string;
    try {
      raw = readFileSync(resolve(cwd, file), 'utf8');
    } catch {
      continue; // no existe: es esperable, los dos son opcionales
    }

    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const eq = trimmed.indexOf('=');
      if (eq < 0) continue;

      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');

      // Lo que ya esta definido no se pisa.
      if (value && process.env[key] === undefined) process.env[key] = value;
    }
  }
}
