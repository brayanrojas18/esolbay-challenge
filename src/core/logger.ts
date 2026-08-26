/**
 * Logging estructurado por etapa, con conteos y tiempos.
 *
 * No usamos una libreria: el CLI necesita salida legible por humanos y un
 * resumen de metricas al final, nada mas que eso.
 */

export interface StageMetrics {
  readonly stage: string;
  readonly ms: number;
  readonly counts: Record<string, number>;
}

const collected: StageMetrics[] = [];

function fmt(value: unknown): string {
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2);
  return String(value);
}

function line(level: string, message: string, fields: Record<string, unknown> = {}): void {
  const rendered = Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${fmt(v)}`)
    .join(' ');
  const prefix = `[${level}]`.padEnd(7);
  process.stderr.write(`${prefix} ${message}${rendered ? '  ' + rendered : ''}\n`);
}

export const log = {
  info: (message: string, fields?: Record<string, unknown>) => line('info', message, fields),
  warn: (message: string, fields?: Record<string, unknown>) => line('warn', message, fields),
  error: (message: string, fields?: Record<string, unknown>) => line('error', message, fields),
  debug: (message: string, fields?: Record<string, unknown>) => {
    if (process.env['DEBUG']) line('debug', message, fields);
  },
};

/**
 * Envuelve una etapa del pipeline midiendo su duracion y registrando los
 * contadores que la etapa quiera reportar.
 */
export async function stage<T>(
  name: string,
  fn: (report: (counts: Record<string, number>) => void) => Promise<T>,
): Promise<T> {
  const started = performance.now();
  let counts: Record<string, number> = {};
  log.info(`> ${name}`);
  try {
    const result = await fn((c) => {
      counts = { ...counts, ...c };
    });
    const ms = performance.now() - started;
    collected.push({ stage: name, ms, counts });
    log.info(`< ${name}`, { ms: Math.round(ms), ...counts });
    return result;
  } catch (e) {
    const ms = performance.now() - started;
    collected.push({ stage: name, ms, counts });
    log.error(`x ${name}`, { ms: Math.round(ms) });
    throw e;
  }
}

export function collectedMetrics(): readonly StageMetrics[] {
  return collected;
}
