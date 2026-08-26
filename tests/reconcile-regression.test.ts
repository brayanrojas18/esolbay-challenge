import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { closeDb, sqlConnection } from '../src/db/client.js';
import { extractOffer } from '../src/extract/index.js';
import { ensureRequisitionEmbeddings, persistOffer } from '../src/ingest/persist-offer.js';
import { seedScenario } from '../src/ingest/csv-seed.js';
import { migrate } from '../src/db/migrate.js';
import { reconcileOffer, type ReconciledLine } from '../src/reconcile/matcher.js';
import { summarize } from '../src/reconcile/persist.js';
import { readGuideFor, type GuideRelation } from './fixtures/reconciliation-guide.js';

/**
 * Test de regresion: la conciliacion del case-simple contra la guia.
 *
 * Corre el pipeline completo -- extraccion, embeddings, prefiltro, matching,
 * conflictos y faltantes -- y compara relacion por relacion.
 *
 * Exige dos cosas distintas: el item identificado tiene que ser exacto
 * siempre, y el estado exacto cuando decide el LLM. Sin LLM se acepta
 * `ambiguous` como degradacion, porque significa "no puedo afirmarlo" y eso
 * nunca es una respuesta incorrecta; un estado equivocado si falla.
 */

const CHALLENGE = resolve(import.meta.dirname, '..', 'challenge');
const SIMPLE = resolve(CHALLENGE, 'case-simple');
const REQUISITION = 'REQ-OFI-2026-001';

const hasDb = Boolean(process.env['DATABASE_URL']);
// Cualquier proveedor sirve: el test no sabe cual esta configurado.
const withLlm = Boolean(
  process.env['OPENAI_API_KEY'] || process.env['GOOGLE_GENERATIVE_AI_API_KEY'],
);
const describeDb = hasDb ? describe : describe.skip;

/** El estado obtenido es aceptable respecto del esperado por la guia. */
function assertStatus(got: ReconciledLine, expected: GuideRelation, label: string): void {
  if (got.status === expected) return;

  if (!withLlm && got.status === 'ambiguous') {
    // Degradacion admitida: el matcher lexico no alcanzo la confianza. Tiene
    // que estar marcada para revision, si no seria un silencio.
    expect(got.needsReview, `${label}: ambiguous sin needsReview`).toBe(true);
    return;
  }

  expect(got.status, label).toBe(expected);
}

interface Prepared {
  readonly offerId: string;
  readonly requisitionId: string;
  readonly providerId: string;
}

const cache = new Map<string, Promise<{ prepared: Prepared; lines: ReconciledLine[] }>>();

/** Extrae, persiste y concilia una oferta. Se cachea: son 4 tests por oferta. */
function run(offerFile: string) {
  const existing = cache.get(offerFile);
  if (existing) return existing;

  const promise = (async () => {
    const offer = await extractOffer(resolve(SIMPLE, 'offers', offerFile), { dryRun: !withLlm });
    const persisted = await persistOffer(offer, REQUISITION, { dryRun: !withLlm });

    const sql = sqlConnection();
    const [row] = await sql<{ requisition_id: string }[]>`
      SELECT requisition_id FROM offers WHERE id = ${persisted.offerId}
    `;

    const prepared: Prepared = {
      offerId: persisted.offerId,
      requisitionId: row!.requisition_id,
      providerId: persisted.providerId,
    };

    const outcome = await reconcileOffer({ ...prepared, dryRun: !withLlm });
    return { prepared, lines: [...outcome.lines] };
  })();

  cache.set(offerFile, promise);
  return promise;
}

async function summaryOf(offerFile: string) {
  const { prepared } = await run(offerFile);
  const outcome = await reconcileOffer({ ...prepared, dryRun: !withLlm });
  return summarize(outcome);
}

describeDb('regresion: case-simple contra reconciliation_guide.md', () => {
  beforeAll(async () => {
    await migrate();
    await seedScenario(SIMPLE);
    await ensureRequisitionEmbeddings(REQUISITION, { dryRun: !withLlm });
  }, 180_000);

  afterAll(async () => {
    await closeDb();
  });

  describe.each([
    ['oferta_oficenter_norte.xlsx'],
    ['oferta_comercial_oficinas.pdf'],
  ])('%s', (offerFile) => {
    it('asocia cada linea ofertada al item solicitado que dice la guia', async () => {
      const { lines } = await run(offerFile);
      const guide = await readGuideFor(SIMPLE, offerFile);

      const byOfferLine = new Map(
        lines.filter((l) => l.offerLineNo !== null).map((l) => [l.offerLineNo!, l]),
      );

      for (const expected of guide.rows) {
        if (expected.offerLineNo === null) continue;
        const got = byOfferLine.get(expected.offerLineNo);
        const label = `${offerFile} linea ${expected.offerLineNo}`;

        expect(got, label).toBeDefined();
        expect(got!.requisitionLineNo, `${label} -> item solicitado`).toBe(
          expected.requisitionLineNo,
        );
      }
    }, 180_000);

    it('asigna el estado que dice la guia', async () => {
      const { lines } = await run(offerFile);
      const guide = await readGuideFor(SIMPLE, offerFile);

      const byOfferLine = new Map(
        lines.filter((l) => l.offerLineNo !== null).map((l) => [l.offerLineNo!, l]),
      );

      for (const expected of guide.rows) {
        if (expected.offerLineNo === null) continue;
        assertStatus(
          byOfferLine.get(expected.offerLineNo)!,
          expected.relation,
          `${offerFile} linea ${expected.offerLineNo} -> estado`,
        );
      }
    }, 180_000);

    it('detecta los faltantes que dice la guia y ninguno de mas', async () => {
      const { lines } = await run(offerFile);
      const guide = await readGuideFor(SIMPLE, offerFile);

      const esperados = guide.rows
        .filter((r) => r.relation === 'missing_from_offer')
        .map((r) => r.requisitionLineNo)
        .sort((a, b) => (a ?? 0) - (b ?? 0));

      const obtenidos = lines
        .filter((l) => l.status === 'missing_from_offer')
        .map((l) => l.requisitionLineNo)
        .sort((a, b) => (a ?? 0) - (b ?? 0));

      expect(obtenidos).toEqual(esperados);
    }, 180_000);

    it('ninguna relacion se pierde: cubiertos + ambiguos = cubiertos de la guia', async () => {
      const summary = await summaryOf(offerFile);
      const guide = await readGuideFor(SIMPLE, offerFile);

      expect(summary.covered + summary.ambiguousItems).toBe(guide.covered);
      expect(summary.byStatus['extra'] ?? 0).toBe(guide.extra);
    }, 180_000);
  });

  it('la cinta con presentacion comercial superior da delta positivo', async () => {
    const { lines } = await run('oferta_oficenter_norte.xlsx');
    const cinta = lines.find((l) => l.offerLineNo === 5);

    expect(cinta).toMatchObject({ requisitionLineNo: 5, quantityDelta: 20 });
    // Delta positivo: el proveedor redondea hacia arriba por presentacion
    // comercial. No perjudica al comprador y el resumen tiene que distinguirlo
    // de un faltante de stock.
    expect(cinta!.quantityDelta).toBeGreaterThan(0);
  }, 180_000);

  it('el PDF trae dos faltantes de stock y ningun sobrante de cantidad', async () => {
    const summary = await summaryOf('oferta_comercial_oficinas.pdf');
    // Resma 90 de 100 y boligrafo 450 de 500.
    expect(summary.shortfallLines).toBe(2);
    expect(summary.overageLines).toBe(0);
  }, 180_000);

  it('el toner que no se pidio no suma al total comparable', async () => {
    const summary = await summaryOf('oferta_comercial_oficinas.pdf');
    expect(summary.extrasTotal).toBeGreaterThan(0);
    expect(summary.comparableTotal).toBeLessThan(summary.quotedTotal);
    expect(summary.quotedTotal - summary.comparableTotal).toBeCloseTo(summary.extrasTotal, 2);
  }, 180_000);

  it('toda linea trae un motivo no vacio y una confianza valida', async () => {
    const { lines } = await run('oferta_oficenter_norte.xlsx');

    // Trazabilidad: el enunciado pide explicar el motivo de CADA decision.
    for (const line of lines) {
      expect(line.reasoning.trim().length, `linea ${line.offerLineNo}`).toBeGreaterThan(10);
      expect(line.confidence).toBeGreaterThanOrEqual(0);
      expect(line.confidence).toBeLessThanOrEqual(1);
    }
  }, 180_000);
});
