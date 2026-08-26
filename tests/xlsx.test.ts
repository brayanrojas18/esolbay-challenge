import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { extractFromXlsx } from '../src/extract/xlsx.js';

const CHALLENGE = resolve(import.meta.dirname, '..', 'challenge');
const simple = resolve(CHALLENGE, 'case-simple/offers/oferta_oficenter_norte.xlsx');
const complex = resolve(CHALLENGE, 'case-complex/offers/oferta_suministros_industriales.xlsx');

describe('extractFromXlsx / case-simple', () => {
  it('lee la cabecera comercial', async () => {
    const offer = await extractFromXlsx({ filePath: simple });
    expect(offer.header.providerName).toBe('Oficenter Norte SA');
    expect(offer.header.quoteCode).toBe('COT-OFN-2026-051');
    expect(offer.header.quoteDate).toBe('2026-05-20');
    expect(offer.header.terms).toMatch(/^Entrega estimada dentro de 7 dias habiles/);
  });

  it('extrae las 7 lineas', async () => {
    const offer = await extractFromXlsx({ filePath: simple });
    expect(offer.items).toHaveLength(7);
    expect(offer.items.map((i) => i.lineNo)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('mapea correctamente la primera linea', async () => {
    const offer = await extractFromXlsx({ filePath: simple });
    expect(offer.items[0]).toMatchObject({
      lineNo: 1,
      supplierCode: 'OFN-00110',
      offeredDescription: 'Paquete de papel blanco tamanio A4 75 gramos',
      offeredQuantity: 100,
      unitOfMeasure: 'unit',
      rawUnit: 'unidad',
      unitPrice: 5200,
      flags: [],
    });
  });

  it('convierte las notas en flags', async () => {
    const offer = await extractFromXlsx({ filePath: simple });
    // Linea 5: cinta, 120 ofertadas contra 100 pedidas, "presentacion comercial superior".
    expect(offer.items[4]).toMatchObject({
      lineNo: 5,
      offeredQuantity: 120,
      unitOfMeasure: 'roll',
      flags: ['min_order_qty'],
    });
    // Linea 7: el extra que no se pidio.
    expect(offer.items[6]).toMatchObject({
      lineNo: 7,
      supplierCode: 'OFN-88001',
      flags: ['extra_suggested'],
    });
  });

  it('no reporta warnings sobre un archivo limpio', async () => {
    const offer = await extractFromXlsx({ filePath: simple });
    expect(offer.meta.warnings.filter((w) => w.code !== 'missing_price')).toEqual([]);
  });

  it('es deterministico y no gasta tokens', async () => {
    const offer = await extractFromXlsx({ filePath: simple });
    expect(offer.meta.strategy).toBe('deterministic');
    expect(offer.meta.llmCalls).toBe(0);
    expect(offer.meta.inputTokens).toBe(0);
    expect(offer.meta.sourceHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('extractFromXlsx / case-complex', () => {
  it('extrae las 225 lineas sin huecos', async () => {
    const offer = await extractFromXlsx({ filePath: complex });
    expect(offer.items).toHaveLength(225);
    expect(offer.items.map((i) => i.lineNo)).toEqual(
      Array.from({ length: 225 }, (_, i) => i + 1),
    );
    expect(offer.meta.warnings.filter((w) => w.code === 'line_gap')).toEqual([]);
  });

  it('lee la cabecera de la propuesta anual', async () => {
    const offer = await extractFromXlsx({ filePath: complex });
    expect(offer.header.providerName).toBe('Suministros Industriales Pampeanos SA');
    expect(offer.header.quoteCode).toBe('COT-SIP-2026-330');
    expect(offer.header.quoteDate).toBe('2026-05-21');
  });

  it('todas las lineas tienen precio, cantidad y unidad conocida', async () => {
    const offer = await extractFromXlsx({ filePath: complex });
    expect(offer.items.filter((i) => i.unitPrice === null)).toEqual([]);
    expect(offer.items.filter((i) => i.offeredQuantity <= 0)).toEqual([]);
    expect(offer.items.filter((i) => i.unitOfMeasure === null)).toEqual([]);
  });

  it('reconoce las 18 unidades crudas y colapsa los sinonimos', async () => {
    const offer = await extractFromXlsx({ filePath: complex });

    const raw = new Set(offer.items.map((i) => i.rawUnit));
    const canonical = new Set(offer.items.map((i) => i.unitOfMeasure));

    expect(raw.size).toBe(18);
    expect(canonical).toContain('meter');
    expect(canonical).toContain('drum');
    expect(canonical).toContain('jar');

    // "paquete" y "pack" conviven en la misma planilla y son lo mismo: la
    // normalizacion tiene que unificarlas, si no el comparativo las trata como
    // dos unidades distintas.
    expect(raw).toContain('paquete');
    expect(raw).toContain('pack');
    expect(canonical.size).toBe(17);
  });

  it('no deja ninguna nota sin mapear a flag', async () => {
    const offer = await extractFromXlsx({ filePath: complex });
    expect(offer.meta.warnings.filter((w) => w.code === 'unknown_note')).toEqual([]);
  });

  it('marca los 5 extras del final', async () => {
    const offer = await extractFromXlsx({ filePath: complex });
    const extras = offer.items.filter((i) => i.supplierCode?.startsWith('SIP-88'));
    expect(extras).toHaveLength(5);
    expect(extras.every((i) => i.flags.length > 0)).toBe(true);
  });

  it('el total cotizado es coherente', async () => {
    const offer = await extractFromXlsx({ filePath: complex });
    const total = offer.items.reduce((acc, i) => acc + i.offeredQuantity * (i.unitPrice ?? 0), 0);
    expect(total).toBeGreaterThan(0);
    expect(Number.isFinite(total)).toBe(true);
  });
});
