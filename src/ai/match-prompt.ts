import { generateObject } from 'ai';
import pLimit from 'p-limit';
import { z } from 'zod';
import { config } from '../core/config.js';
import { log } from '../core/logger.js';
import { languageModel, tokenCounts } from './client.js';
import type { Candidate } from '../reconcile/candidates.js';

/**
 * Nivel 2 de la cascada: el LLM elige, entre los 5 candidatos que trajo el
 * prefiltro vectorial, cual corresponde a cada linea ofertada.
 *
 * Por que 5 y no 220: el prefiltro ya hizo el trabajo pesado dentro de Postgres.
 * Pasarle al modelo los 220 items solicitados en cada llamada costaria unas 40
 * veces mas tokens para decidir lo mismo, y con peor precision: un contexto
 * largo lleno de candidatos irrelevantes empeora la decision.
 *
 * Por que en lotes de 10 lineas: amortiza el prompt de sistema entre varias
 * decisiones sin que la respuesta se vuelva larga y descuidada.
 */

const decisionSchema = z.object({
  decisions: z.array(
    z.object({
      offerLineNo: z.number().int().describe('Numero de linea ofertada que se esta decidiendo'),
      matchedRequisitionLineNo: z
        .number()
        .int()
        .nullable()
        .describe('Numero del item solicitado que corresponde, o null si ninguno de los candidatos corresponde'),
      confidence: z.number().min(0).max(1).describe('Confianza de 0 a 1'),
      reasoning: z
        .string()
        .describe('Una frase en espaniol, concreta, explicando por que. Sin relleno.'),
    }),
  ),
});

const SYSTEM_PROMPT = `Sos un analista de compras (procurement) de una empresa argentina.

Tu tarea: decidir si una linea de la cotizacion de un proveedor corresponde a alguno de los
items que la empresa pidio.

Contexto del dominio, importante:
- El proveedor NO usa las mismas palabras que la requisicion. Describe el mismo producto con
  el vocabulario de su propio catalogo. Eso es normal y NO es motivo para descartar un match.
- Ejemplos reales de equivalencia:
    "Cable unipolar 1.5mm2 rojo"      = "Conductor flexible 1.5 mm2 rojo"
    "Precinto plastico 200mm"          = "Brida plastica 200 mm"
    "Llave termomagnetica bipolar 16A" = "Interruptor automatico 2 polos 16 A"
    "Multimetro digital basico"        = "Tester digital basico"
    "Ficha macho 10A"                  = "Plug macho 10 A"
    "Canaleta PVC 20x10 blanca"        = "Ducto polipropileno pasacable 20x10 blanca"
- Las MEDIDAS y ESPECIFICACIONES si tienen que coincidir. "Cable 1.5 mm2 rojo" y
  "Cable 2.5 mm2 rojo" son productos DISTINTOS aunque se parezcan mucho.
- El color, la seccion, el diametro y la potencia son parte de la identidad del producto.

Reglas de decision:
- Elegi el candidato que sea el MISMO producto, aunque este descripto con otras palabras.
- Si ninguno de los candidatos es el mismo producto, devolve null. Es preferible un null
  honesto a un match inventado: del otro lado hay una persona que va a comprar con esto.
- La cantidad NO influye en la decision de a que item corresponde. Una linea puede cotizar
  menos unidades de las pedidas y seguir siendo el mismo producto.
- confidence alta (>0.85) si es claramente el mismo producto.
- confidence media (0.6 a 0.85) si es el mismo producto pero con alguna diferencia de
  especificacion menor o descripcion incompleta.
- confidence baja (<0.6) si dudas. Ese caso se marca para revision humana, que es
  exactamente lo que corresponde.`;

export interface MatchRequest {
  readonly offerLineNo: number;
  readonly supplierCode: string | null;
  readonly description: string;
  readonly quantity: number;
  readonly unit: string | null;
  readonly candidates: readonly Candidate[];
}

export interface MatchDecision {
  readonly offerLineNo: number;
  readonly matchedRequisitionLineNo: number | null;
  readonly confidence: number;
  readonly reasoning: string;
}

export interface MatchOutcome {
  readonly decisions: ReadonlyMap<number, MatchDecision>;
  readonly calls: number;
  readonly batches: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly failedLines: readonly number[];
}

export async function decideMatches(
  requests: readonly MatchRequest[],
  { batchSize = 10, concurrency = 3 }: { batchSize?: number; concurrency?: number } = {},
): Promise<MatchOutcome> {
  const batches: MatchRequest[][] = [];
  for (let i = 0; i < requests.length; i += batchSize) {
    batches.push(requests.slice(i, i + batchSize) as MatchRequest[]);
  }

  const limit = pLimit(concurrency);
  const decisions = new Map<number, MatchDecision>();
  const failedLines: number[] = [];
  let calls = 0;
  let inputTokens = 0;
  let outputTokens = 0;

  log.info('decidiendo matches con el LLM', {
    lineas: requests.length,
    lotes: batches.length,
    candidatosPorLinea: requests[0]?.candidates.length ?? 0,
  });

  await Promise.all(
    batches.map((batch, index) =>
      limit(async () => {
        const outcome = await runBatch(batch, index);
        calls += outcome.calls;
        inputTokens += outcome.inputTokens;
        outputTokens += outcome.outputTokens;

        for (const decision of outcome.decisions) decisions.set(decision.offerLineNo, decision);
        for (const line of outcome.failed) failedLines.push(line);
      }),
    ),
  );

  return {
    decisions,
    calls,
    batches: batches.length,
    inputTokens,
    outputTokens,
    failedLines,
  };
}

function renderBatch(batch: readonly MatchRequest[]): string {
  return batch
    .map((request) => {
      const candidates = request.candidates
        .map(
          (c) =>
            `      - item #${c.lineNo} (similitud ${c.score.toFixed(3)}): "${c.description}" ` +
            `[pedido: ${c.quantity} ${c.unitOfMeasure ?? ''}]`,
        )
        .join('\n');

      return (
        `  LINEA OFERTADA ${request.offerLineNo}\n` +
        `    codigo del proveedor: ${request.supplierCode ?? '(sin codigo)'}\n` +
        `    descripcion: "${request.description}"\n` +
        `    cotiza: ${request.quantity} ${request.unit ?? ''}\n` +
        `    candidatos:\n${candidates || '      (ninguno)'}`
      );
    })
    .join('\n\n');
}

async function runBatch(
  batch: readonly MatchRequest[],
  index: number,
): Promise<{
  decisions: MatchDecision[];
  failed: number[];
  calls: number;
  inputTokens: number;
  outputTokens: number;
}> {
  const basePrompt = `Decidi, para cada una de estas ${batch.length} lineas ofertadas, cual de sus
candidatos corresponde al mismo producto (o null si ninguno).

${renderBatch(batch)}

Devolve una decision por cada linea ofertada listada, usando su numero de linea.`;

  let calls = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let lastError: unknown;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const prompt =
      attempt === 1
        ? basePrompt
        : `${basePrompt}

Tu respuesta anterior fue rechazada por este error de validacion:
${lastError instanceof Error ? lastError.message : String(lastError)}
Corregila y respetá el schema exactamente.`;

    try {
      const result = await generateObject({
        model: languageModel(),
        schema: decisionSchema,
        schemaName: 'match_decisions',
        schemaDescription: 'Decision de conciliacion para cada linea ofertada',
        system: SYSTEM_PROMPT,
        prompt,
        temperature: 0,
      });

      calls++;
      const usage = tokenCounts(result.usage);
      inputTokens += usage.inputTokens;
      outputTokens += usage.outputTokens;

      const valid = new Set(batch.map((r) => r.offerLineNo));
      const decisions = result.object.decisions.filter((d) => valid.has(d.offerLineNo));
      const decided = new Set(decisions.map((d) => d.offerLineNo));

      return {
        decisions,
        failed: batch.map((r) => r.offerLineNo).filter((n) => !decided.has(n)),
        calls,
        inputTokens,
        outputTokens,
      };
    } catch (e) {
      lastError = e;
      calls++;
      log.warn(`lote de matching ${index + 1}: intento ${attempt} fallido`, {
        error: e instanceof Error ? e.message.slice(0, 160) : String(e),
      });
    }
  }

  // El lote entero cae a `ambiguous`, que es el comportamiento correcto: el
  // sistema no pudo decidir y lo dice, en vez de tumbar la corrida entera.
  return {
    decisions: [],
    failed: batch.map((r) => r.offerLineNo),
    calls,
    inputTokens,
    outputTokens,
  };
}

export function matchModelName(): string {
  return config().llmModel;
}
