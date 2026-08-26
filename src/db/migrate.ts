import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { config } from '../core/config.js';
import { ConfigError } from '../core/errors.js';
import { log } from '../core/logger.js';
import { closeDb, sqlConnection } from './client.js';

/**
 * Runner de migraciones propio en vez de `drizzle-kit migrate`, por dos cosas:
 * las migraciones son SQL a mano y se leen mejor que un diff generado, y
 * drizzle-kit toma un advisory lock de sesion que el transaction pooler de
 * Supabase no sostiene. Este usa una tabla de control.
 */

const MIGRATIONS_DIR = resolve(import.meta.dirname, 'migrations');

/**
 * La dimension del vector se sustituye al aplicar la migracion, porque cada
 * proveedor de embeddings devuelve una distinta y la columna la declara fija.
 * El hash de control se calcula sobre la plantilla, no sobre el SQL final.
 */
const DIMENSION_PLACEHOLDER = /\{\{EMBEDDING_DIM\}\}/g;

export async function migrate(): Promise<void> {
  const sql = sqlConnection();
  const dimensions = config().embeddingDimensions;

  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      name       text PRIMARY KEY,
      hash       text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();
  const applied = await sql<{ name: string; hash: string }[]>`SELECT name, hash FROM _migrations`;
  const appliedByName = new Map(applied.map((r) => [r.name, r.hash]));

  let ran = 0;

  for (const file of files) {
    const template = await readFile(resolve(MIGRATIONS_DIR, file), 'utf8');
    const hash = createHash('sha256').update(template).digest('hex');
    const previous = appliedByName.get(file);

    if (previous) {
      if (previous !== hash) {
        log.warn('migracion ya aplicada pero modificada despues', { archivo: file });
      }
      continue;
    }

    log.info('aplicando migracion', { archivo: file, dimensiones: dimensions });
    const statements = template.replace(DIMENSION_PLACEHOLDER, String(dimensions));

    // El archivo entero va como un solo statement multiple: Postgres lo envuelve
    // en una transaccion implicita, asi que o entra completo o no entra.
    await sql.unsafe(statements);
    await sql`INSERT INTO _migrations (name, hash) VALUES (${file}, ${hash})`;
    ran++;
  }

  log.info('migraciones al dia', { aplicadas: ran, total: files.length });

  if (ran === 0) await verifyEmbeddingDimension();
}

/**
 * Sin esto, cambiar de proveedor sobre una base ya migrada falla recien al
 * insertar, con un error de Postgres que no dice que hacer.
 */
export async function verifyEmbeddingDimension(): Promise<void> {
  const sql = sqlConnection();
  const expected = config().embeddingDimensions;

  const rows = await sql<{ table_name: string; dimensions: number }[]>`
    SELECT c.relname AS table_name,
           a.atttypmod AS dimensions
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE a.attname = 'embedding'
      AND n.nspname = 'public'
      -- Solo tablas: los indices HNSW aparecen aca con su propia columna.
      AND c.relkind = 'r'
      AND a.attnum > 0
      AND NOT a.attisdropped
  `;

  const mismatched = rows.filter((r) => r.dimensions !== expected);
  if (mismatched.length === 0) return;

  throw new ConfigError(
    'la dimension de los embeddings no coincide con la de la base. ' +
      'Vectores de dos modelos distintos no son comparables: hay que recrear las columnas ' +
      'y regenerar los embeddings',
    {
      configurada: expected,
      enLaBase: mismatched.map((r) => `${r.table_name}=${r.dimensions}`).join(', '),
      solucion: 'ajusta EMBEDDING_DIMENSIONS, o borra las tablas y volve a correr "npm run seed"',
    },
  );
}

// Ejecutable directo: npm run db:migrate
if (import.meta.filename === process.argv[1]) {
  migrate()
    .then(() => closeDb())
    .then(() => process.exit(0))
    .catch(async (e: unknown) => {
      log.error(e instanceof Error ? e.message : String(e));
      await closeDb();
      process.exit(1);
    });
}
