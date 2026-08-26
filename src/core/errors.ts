/**
 * Errores de dominio tipados.
 *
 * Regla del pipeline: un error de una linea nunca puede tumbar la corrida de
 * 230. Por eso los errores llevan el contexto suficiente (archivo, linea) para
 * degradar esa linea sola y seguir.
 */

export type ErrorContext = Record<string, string | number | undefined>;

abstract class DomainError extends Error {
  abstract readonly kind: string;

  constructor(
    message: string,
    readonly context: ErrorContext = {},
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = new.target.name;
  }

  /** Una linea legible para el log estructurado. */
  describe(): string {
    const ctx = Object.entries(this.context)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${v}`)
      .join(' ');
    return ctx ? `${this.name}: ${this.message} (${ctx})` : `${this.name}: ${this.message}`;
  }
}

/** Fallo al leer o interpretar un archivo de oferta (PDF/XLSX). */
export class ExtractionError extends DomainError {
  readonly kind = 'extraction';
}

/** Fallo al conciliar una linea ofertada contra la solicitud. */
export class MatchingError extends DomainError {
  readonly kind = 'matching';
}

/** Falta configuracion o es invalida (env, rutas, credenciales). */
export class ConfigError extends DomainError {
  readonly kind = 'config';
}

export function isDomainError(e: unknown): e is ExtractionError | MatchingError | ConfigError {
  return e instanceof ExtractionError || e instanceof MatchingError || e instanceof ConfigError;
}

/** Mensaje legible de cualquier throwable, sin asumir que es Error. */
export function errorMessage(e: unknown): string {
  if (isDomainError(e)) return e.describe();
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  return String(e);
}
