import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { extractFromPdf, crossCheck } from '../src/extract/pdf.js';
import { isTableHeaderRow, readPdfText } from '../src/extract/pdf-text.js';
import type { ExtractedOfferItem } from '../src/extract/schemas.js';

const CHALLENGE = resolve(import.meta.dirname, '..', 'challenge');
const mis = resolve(CHALLENGE, 'case-complex/offers/oferta_mantenimiento_integral.pdf');
const cos = resolve(CHALLENGE, 'case-simple/offers/oferta_comercial_oficinas.pdf');

describe('isTableHeaderRow', () => {
  it('reconoce la fila de encabezado que el PDF repite en cada pagina', () => {
    expect(
      isTableHeaderRow('Linea Codigo proveedor Descripcion ofertada Cantidad Unidad Precio unit. Notas'),
    ).toBe(true);
  });

  it('no confunde una linea de producto que menciona una etiqueta', () => {
    expect(isTableHeaderRow('45 MIS-00418 Cantidad de tubos por caja 12 unidad 1.200,00')).toBe(false);
    expect(isTableHeaderRow('1 MIS-00110 Conductor flexible 1.5 mm2 rojo 1000 metro 441,35')).toBe(false);
  });
});

describe('readPdfText', () => {
  it('descarta el encabezado repetido en las 7 paginas', async () => {
    const text = await readPdfText(await readFile(mis));
    expect(text.pageCount).toBe(7);
    expect(text.droppedHeaderRows).toBe(7);
    expect(text.bodyLines.some((l) => isTableHeaderRow(l))).toBe(false);
  });

  it('separa la cabecera comercial del cuerpo de la tabla', async () => {
    const text = await readPdfText(await readFile(mis));
    expect(text.headerBlock).toContain('Mantenimiento Integral Sur SRL');
    expect(text.headerBlock).toContain('COT-MIS-2026-407');
    expect(text.bodyLines[0]).toMatch(/^1 MIS-00110/);
  });
});

describe('extractFromPdf --dry-run / case-complex', () => {
  it('extrae las 177 lineas sin huecos de numeracion', async () => {
    const offer = await extractFromPdf({ filePath: mis, dryRun: true });
    expect(offer.items).toHaveLength(177);
    expect(offer.items.map((i) => i.lineNo)).toEqual(Array.from({ length: 177 }, (_, i) => i + 1));
    expect(offer.meta.warnings.filter((w) => w.code === 'line_gap')).toEqual([]);
  });

  it('lee la cabecera completa', async () => {
    const offer = await extractFromPdf({ filePath: mis, dryRun: true });
    expect(offer.header).toMatchObject({
      providerName: 'Mantenimiento Integral Sur SRL',
      quoteCode: 'COT-MIS-2026-407',
      quoteDate: '2026-05-23',
    });
    expect(offer.header.terms).toContain('Propuesta anual parcial');
  });

  it('convierte los precios es-AR correctamente', async () => {
    const offer = await extractFromPdf({ filePath: mis, dryRun: true });
    // "441,35" -> 441.35 (no 44135, no 441)
    expect(offer.items[0]?.unitPrice).toBe(441.35);
    // "3.182,40" -> 3182.4: el separador de miles no se puede perder.
    expect(offer.items[23]?.unitPrice).toBe(3182.4);
    expect(offer.items.every((i) => i.unitPrice !== null && i.unitPrice > 0)).toBe(true);
  });

  it('limpia el prefijo "Equivalente tecnico" de 16 descripciones', async () => {
    const offer = await extractFromPdf({ filePath: mis, dryRun: true });
    const equivalents = offer.items.filter((i) => i.flags.includes('technical_equivalent'));
    expect(equivalents).toHaveLength(16);
    expect(equivalents.every((i) => !/^equivalente/i.test(i.offeredDescription))).toBe(true);

    const line11 = offer.items.find((i) => i.lineNo === 11);
    expect(line11?.offeredDescription).toBe('Conductor flexible 4 mm2 verde amarillo');
  });

  it('limpia el sufijo "linea alternativa" de 10 descripciones', async () => {
    const offer = await extractFromPdf({ filePath: mis, dryRun: true });
    const alternatives = offer.items.filter((i) => i.flags.includes('alternative_line'));
    // 10 con el sufijo en la descripcion + 1 con la nota "equivalente alternativo".
    expect(alternatives.length).toBeGreaterThanOrEqual(10);
    expect(alternatives.every((i) => !/linea alternativa$/i.test(i.offeredDescription))).toBe(true);

    const line17 = offer.items.find((i) => i.lineNo === 17);
    expect(line17?.offeredDescription).toBe('Interruptor automatico 2 polos 16 A');
  });

  it('mapea el vocabulario completo de notas sin dejar ninguna suelta', async () => {
    const offer = await extractFromPdf({ filePath: mis, dryRun: true });
    expect(offer.meta.warnings.filter((w) => w.code === 'unknown_note')).toEqual([]);

    const conNotas = offer.items.filter((i) => i.rawNotes !== null);
    expect(conNotas.every((i) => i.flags.length > 0)).toBe(true);
  });

  it('detecta los 5 extras del final', async () => {
    const offer = await extractFromPdf({ filePath: mis, dryRun: true });
    const extras = offer.items.filter((i) => i.supplierCode?.startsWith('MIS-99'));
    expect(extras).toHaveLength(5);
    expect(extras.map((i) => i.lineNo)).toEqual([173, 174, 175, 176, 177]);
  });

  it('registra que no gasto tokens en --dry-run', async () => {
    const offer = await extractFromPdf({ filePath: mis, dryRun: true });
    expect(offer.meta.strategy).toBe('deterministic');
    expect(offer.meta.llmCalls).toBe(0);
    expect(offer.meta.modelUsed).toBeNull();
  });
});

describe('extractFromPdf --dry-run / case-simple', () => {
  it('extrae las 6 lineas con su cabecera', async () => {
    const offer = await extractFromPdf({ filePath: cos, dryRun: true });
    expect(offer.items).toHaveLength(6);
    expect(offer.header.providerName).toBe('Comercial Oficinas del Sur');
    expect(offer.header.quoteCode).toBe('COT-COS-2026-119');
    expect(offer.header.quoteDate).toBe('2026-05-22');
  });

  it('detecta el stock parcial de las dos primeras lineas', async () => {
    const offer = await extractFromPdf({ filePath: cos, dryRun: true });
    expect(offer.items[0]).toMatchObject({ offeredQuantity: 90, flags: ['partial_stock'] });
    expect(offer.items[1]).toMatchObject({ offeredQuantity: 450, flags: ['partial_stock'] });
  });

  it('no deja notas sin mapear', async () => {
    const offer = await extractFromPdf({ filePath: cos, dryRun: true });
    expect(offer.meta.warnings.filter((w) => w.code === 'unknown_note')).toEqual([]);
  });
});

describe('crossCheck', () => {
  const base: ExtractedOfferItem = {
    lineNo: 1,
    supplierCode: 'MIS-00110',
    offeredDescription: 'Conductor flexible 1.5 mm2 rojo',
    offeredQuantity: 1000,
    unitOfMeasure: 'meter',
    rawUnit: 'metro',
    unitPrice: 441.35,
    rawNotes: null,
    flags: [],
  };

  it('no reporta nada cuando las dos estrategias coinciden', () => {
    expect(crossCheck([base], [base])).toEqual([]);
  });

  it('detecta que el LLM leyo otro precio', () => {
    const alucinado = { ...base, unitPrice: 44135 };
    const warnings = crossCheck([alucinado], [base]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.message).toContain('precio unitario');
    expect(warnings[0]?.lineNo).toBe(1);
  });

  it('detecta que el LLM omitio una linea', () => {
    const warnings = crossCheck([], [base]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.code).toBe('llm_failed');
    expect(warnings[0]?.message).toContain('omitio');
  });

  it('no reporta nada si no hay con que comparar', () => {
    expect(crossCheck([base], [])).toEqual([]);
  });
});
