import { ConfigError } from '../core/errors.js';

/**
 * Parseo minimo de argumentos de linea de comandos.
 *
 * Sin dependencia externa a proposito: son cuatro comandos con tres flags cada
 * uno. Meter commander o yargs para esto seria agregar peso sin resolver nada.
 */

export interface ParsedArgs {
  readonly flags: ReadonlyMap<string, string>;
  readonly booleans: ReadonlySet<string>;
  readonly positional: readonly string[];
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const flags = new Map<string, string>();
  const booleans = new Set<string>();
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]!;

    if (!token.startsWith('--')) {
      positional.push(token);
      continue;
    }

    const body = token.slice(2);
    const eq = body.indexOf('=');

    if (eq >= 0) {
      flags.set(body.slice(0, eq), body.slice(eq + 1));
      continue;
    }

    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      flags.set(body, next);
      i++;
    } else {
      booleans.add(body);
    }
  }

  return { flags, booleans, positional };
}

export function requireFlag(args: ParsedArgs, name: string, hint: string): string {
  const value = args.flags.get(name);
  if (value === undefined || value === '') {
    throw new ConfigError(`falta el argumento --${name}`, { uso: hint });
  }
  return value;
}
