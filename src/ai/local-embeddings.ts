import { config } from '../core/config.js';
import { stripAccents } from '../extract/normalize.js';

/**
 * Embeddings locales deterministicos, para correr sin API key.
 *
 * Es un baseline lexico: proyecta el texto a las mismas 1536 dimensiones
 * usando hashing de tokens y trigramas, asi el resto del pipeline -- la columna
 * vector, el indice HNSW, la query de candidatos -- funciona igual.
 *
 * No es semantico. Acierta cuando comparten vocabulario y falla cuando no, que
 * es justo el caso interesante. La brecha esta medida en el README.
 */

/** Tokens: corridas de letras y numeros (con decimal), por separado.
 *  "1.5mm2" -> ["1.5", "mm", "2"], que es lo que permite que matchee con
 *  "1.5 mm2" escrito con espacios. */
const TOKEN = /\d+(?:[.,]\d+)?|[a-z]+/g;

const TRIGRAM_WEIGHT = 0.35;

/** FNV-1a de 32 bits: estable entre corridas y entre maquinas. */
function fnv1a(text: string, seed: number): number {
  let hash = 0x811c9dc5 ^ seed;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function tokenize(text: string): string[] {
  const normalized = stripAccents(text).toLowerCase().replace(/,/g, '.');
  return normalized.match(TOKEN) ?? [];
}

function trigrams(tokens: readonly string[]): string[] {
  const grams: string[] = [];
  for (const token of tokens) {
    if (token.length < 4) continue;
    for (let i = 0; i <= token.length - 3; i++) grams.push(token.slice(i, i + 3));
  }
  return grams;
}

/**
 * Suma una caracteristica al vector con hashing con signo: el segundo hash
 * decide si suma o resta, lo que hace que las colisiones se cancelen en vez de
 * acumularse.
 */
function accumulate(vector: Float64Array, feature: string, weight: number): void {
  const index = fnv1a(feature, 0) % vector.length;
  const sign = fnv1a(feature, 0x9e3779b9) & 1 ? 1 : -1;
  vector[index] = (vector[index] ?? 0) + sign * weight;
}

export function localEmbedding(text: string): number[] {
  const dimensions = config().embeddingDimensions;
  const vector = new Float64Array(dimensions);

  const tokens = tokenize(text);
  for (const token of tokens) accumulate(vector, `t:${token}`, 1);
  for (const gram of trigrams(tokens)) accumulate(vector, `g:${gram}`, TRIGRAM_WEIGHT);

  // Normalizacion L2: con vectores unitarios la distancia coseno de pgvector es
  // directamente comparable entre pares.
  let norm = 0;
  for (const value of vector) norm += value * value;
  norm = Math.sqrt(norm);

  if (norm === 0) {
    // Texto sin ningun token reconocible. Se devuelve un vector fijo no nulo
    // para no romper el indice; su similitud contra cualquier cosa sera baja.
    const fallback = new Array<number>(dimensions).fill(0);
    fallback[0] = 1;
    return fallback;
  }

  return Array.from(vector, (value) => value / norm);
}
