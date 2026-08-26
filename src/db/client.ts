import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { requireDatabaseUrl } from '../core/config.js';
import * as schema from './schema.js';

/**
 * Cliente de Postgres.
 *
 * prepare:false porque la connection string es la del transaction pooler de
 * Supabase (6543), que no soporta prepared statements. Con el session pooler se
 * podria activar, pero en false anda con los dos.
 */

let sqlClient: ReturnType<typeof postgres> | undefined;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function sqlConnection() {
  sqlClient ??= postgres(requireDatabaseUrl(), {
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 30,
    ssl: 'require',
    onnotice: () => {},
  });
  return sqlClient;
}

export function db() {
  dbInstance ??= drizzle(sqlConnection(), { schema });
  return dbInstance;
}

export async function closeDb(): Promise<void> {
  if (sqlClient) {
    await sqlClient.end({ timeout: 5 });
    sqlClient = undefined;
    dbInstance = undefined;
  }
}

export { schema };
