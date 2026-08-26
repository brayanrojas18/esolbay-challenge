import { sqlConnection } from '../db/client.js';
import { toPgVector } from '../ai/embeddings.js';

/**
 * Prefiltro vectorial: por cada linea ofertada, los K items solicitados mas
 * parecidos.
 *
 * ESTE ES EL PUNTO DE VOLUMEN DEL CHALLENGE.
 *
 * Fuerza bruta con el case-complex son 220 items x 225 lineas = 49.500
 * comparaciones, y ademas habria que traerse los 220 items a memoria de Node
 * para calcular coseno a mano. Con el prefiltro son 225 queries indexadas que
 * resuelve Postgres con HNSW, y cada una devuelve 5 filas.
 *
 * El costo del LLM cae en la misma proporcion: en vez de razonar sobre 220
 * candidatos por linea, razona sobre 5.
 *
 * La query corre DENTRO de Postgres. El operador <=> es distancia coseno de
 * pgvector y usa el indice HNSW; la similitud que se reporta es 1 - distancia.
 */

export interface Candidate {
  readonly requisitionItemId: string;
  readonly lineNo: number;
  readonly description: string;
  readonly quantity: number;
  readonly unitOfMeasure: string | null;
  /** 0 a 1. Mas alto es mas parecido. */
  readonly score: number;
}

export const DEFAULT_TOP_K = 5;

/**
 * Trae los top-K candidatos para un vector. Una query por linea ofertada.
 */
export async function findCandidates(
  requisitionId: string,
  embedding: readonly number[],
  topK: number = DEFAULT_TOP_K,
): Promise<Candidate[]> {
  const sql = sqlConnection();
  const vector = toPgVector(embedding);

  const rows = await sql<
    {
      id: string;
      line_no: number;
      raw_description: string;
      quantity: string;
      unit_of_measure: string | null;
      score: number;
    }[]
  >`
    SELECT
      ri.id,
      ri.line_no,
      ri.raw_description,
      ri.quantity,
      ri.unit_of_measure,
      1 - (ri.embedding <=> ${vector}::vector) AS score
    FROM requisition_items ri
    WHERE ri.requisition_id = ${requisitionId}
      AND ri.embedding IS NOT NULL
    ORDER BY ri.embedding <=> ${vector}::vector
    LIMIT ${topK}
  `;

  return rows.map((r) => ({
    requisitionItemId: r.id,
    lineNo: r.line_no,
    description: r.raw_description,
    quantity: Number(r.quantity),
    unitOfMeasure: r.unit_of_measure,
    score: Number(r.score),
  }));
}

/**
 * Todo el prefiltro de una oferta en UNA SOLA query.
 *
 * Este es el camino que usa el pipeline, y la diferencia no es cosmetica:
 * emitir una query por linea son 177 viajes de ida y vuelta a Supabase, que
 * medidos dieron 650 ms cada uno -- casi dos minutos de pura latencia de red
 * para un trabajo que Postgres hace en milisegundos.
 *
 * Como los dos lados ya viven en la misma base, el CROSS JOIN LATERAL calcula
 * el top-K de cada linea ofertada sin que los vectores salgan del servidor.
 * Cada iteracion del lateral sigue usando el indice HNSW, porque oi.embedding
 * es constante dentro de la subconsulta.
 *
 * Resultado sobre el case-complex: 1 query en lugar de 177, y 0 vectores de
 * 1536 dimensiones viajando por la red.
 */
export async function findCandidatesForOffer(
  offerId: string,
  requisitionId: string,
  topK: number = DEFAULT_TOP_K,
): Promise<Map<number, Candidate[]>> {
  const sql = sqlConnection();

  const rows = await sql<
    {
      offer_line_no: number;
      id: string;
      line_no: number;
      raw_description: string;
      quantity: string;
      unit_of_measure: string | null;
      score: number;
    }[]
  >`
    SELECT
      oi.line_no AS offer_line_no,
      c.id,
      c.line_no,
      c.raw_description,
      c.quantity,
      c.unit_of_measure,
      c.score
    FROM offer_items oi
    CROSS JOIN LATERAL (
      SELECT
        ri.id,
        ri.line_no,
        ri.raw_description,
        ri.quantity,
        ri.unit_of_measure,
        1 - (ri.embedding <=> oi.embedding) AS score
      FROM requisition_items ri
      WHERE ri.requisition_id = ${requisitionId}
        AND ri.embedding IS NOT NULL
      ORDER BY ri.embedding <=> oi.embedding
      LIMIT ${topK}
    ) c
    WHERE oi.offer_id = ${offerId}
      AND oi.embedding IS NOT NULL
    ORDER BY oi.line_no, c.score DESC
  `;

  const byOfferLine = new Map<number, Candidate[]>();

  for (const row of rows) {
    const list = byOfferLine.get(row.offer_line_no) ?? [];
    list.push({
      requisitionItemId: row.id,
      lineNo: row.line_no,
      description: row.raw_description,
      quantity: Number(row.quantity),
      unitOfMeasure: row.unit_of_measure,
      score: Number(row.score),
    });
    byOfferLine.set(row.offer_line_no, list);
  }

  return byOfferLine;
}

/**
 * Cuenta cuantas comparaciones habria hecho la fuerza bruta. Se reporta en la
 * trazabilidad para que el numero del README sea medido y no estimado.
 */
export function bruteForceComparisons(offerLines: number, requisitionItems: number): number {
  return offerLines * requisitionItems;
}
