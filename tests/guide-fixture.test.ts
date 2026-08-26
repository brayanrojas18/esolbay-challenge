import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { readGuide, readGuideFor, expectedMatches } from './fixtures/reconciliation-guide.js';

/**
 * Tests del propio lector de la guia. Si el lector esta mal, el test de
 * regresion que se apoya en el mide cualquier cosa.
 */

const CHALLENGE = resolve(import.meta.dirname, '..', 'challenge');
const simpleDir = resolve(CHALLENGE, 'case-simple');
const complexDir = resolve(CHALLENGE, 'case-complex');

describe('lector de reconciliation_guide.md / case-simple', () => {
  it('encuentra las dos ofertas', async () => {
    const sections = await readGuide(simpleDir);
    expect(sections.map((s) => s.offerFile)).toEqual([
      'oferta_oficenter_norte.xlsx',
      'oferta_comercial_oficinas.pdf',
    ]);
  });

  it('lee los totales declarados del XLSX', async () => {
    const section = await readGuideFor(simpleDir, 'oferta_oficenter_norte.xlsx');
    expect(section).toMatchObject({ covered: 6, missing: 0, extra: 1 });
    expect(section.rows).toHaveLength(7);
  });

  it('lee las relaciones del PDF, incluido el faltante', async () => {
    const section = await readGuideFor(simpleDir, 'oferta_comercial_oficinas.pdf');
    expect(section).toMatchObject({ covered: 5, missing: 1, extra: 1 });

    const faltante = section.rows.find((r) => r.relation === 'missing_from_offer');
    expect(faltante).toMatchObject({
      requisitionLineNo: 3,
      requestedDescription: 'Carpeta plastica A4',
      offerLineNo: null,
      supplierCode: null,
    });

    const sobrante = section.rows.find((r) => r.relation === 'extra');
    expect(sobrante).toMatchObject({
      requisitionLineNo: null,
      offerLineNo: 6,
      supplierCode: 'COS-77015',
    });
  });

  it('en el case-simple los totales declarados si coinciden con las filas', async () => {
    for (const section of await readGuide(simpleDir)) {
      const cubiertos = section.rows.filter(
        (r) => r.requisitionLineNo !== null && r.offerLineNo !== null,
      ).length;
      const faltantes = section.rows.filter((r) => r.relation === 'missing_from_offer').length;
      const sobrantes = section.rows.filter((r) => r.relation === 'extra').length;

      expect(cubiertos, `cubiertos en ${section.offerFile}`).toBe(section.covered);
      expect(faltantes, `faltantes en ${section.offerFile}`).toBe(section.missing);
      expect(sobrantes, `sobrantes en ${section.offerFile}`).toBe(section.extra);
    }
  });
});

describe('lector de reconciliation_guide.md / case-complex', () => {
  it('lee las 225 filas del XLSX', async () => {
    const section = await readGuideFor(complexDir, 'oferta_suministros_industriales.xlsx');
    expect(section).toMatchObject({ covered: 220, missing: 0, extra: 5 });
    expect(section.rows).toHaveLength(225);
  });

  /**
   * INCONSISTENCIA DEL MATERIAL DEL CHALLENGE.
   *
   * La guia del PDF declara "Items solicitados cubiertos: 172" pero su tabla
   * solo documenta 164 relaciones con los dos lados. Faltan 8 filas, que
   * corresponden a estas lineas de la oferta:
   *
   *   23, 46, 69, 92, 115, 138  -> las seis con la nota "marca a confirmar"
   *   143, 170                  -> dos equivalentes tecnicos
   *
   * Las ocho son coincidencias legitimas verificables a mano. Por ejemplo la
   * 170, "Taladro impacto 650 W", corresponde al item #209 "Taladro percutor
   * 650W". El generador de la guia parece haberlas descartado por su nota.
   *
   * Consecuencia para el test de regresion: se compara contra las filas
   * DOCUMENTADAS, y las 8 restantes se reportan aparte como no cubiertas por la
   * guia. Exigir igualdad contra un total que la propia guia no sostiene seria
   * medir mal.
   */
  it('documenta 217 filas aunque el encabezado declare 225', async () => {
    const section = await readGuideFor(complexDir, 'oferta_mantenimiento_integral.pdf');

    expect(section).toMatchObject({ covered: 172, missing: 48, extra: 5 });
    expect(section.covered + section.missing + section.extra).toBe(225);

    // Pero la tabla trae 8 filas menos que las declaradas.
    expect(section.rows).toHaveLength(217);

    const documentadasConDosLados = section.rows.filter(
      (r) => r.requisitionLineNo !== null && r.offerLineNo !== null,
    ).length;
    expect(documentadasConDosLados).toBe(164);
    expect(section.covered - documentadasConDosLados).toBe(8);
  });

  it('omite justo las 8 lineas de oferta 23, 46, 69, 92, 115, 138, 143 y 170', async () => {
    const section = await readGuideFor(complexDir, 'oferta_mantenimiento_integral.pdf');
    const documentadas = new Set(
      section.rows.filter((r) => r.offerLineNo !== null).map((r) => r.offerLineNo),
    );

    const ausentes = Array.from({ length: 177 }, (_, i) => i + 1).filter(
      (n) => !documentadas.has(n),
    );
    expect(ausentes).toEqual([23, 46, 69, 92, 115, 138, 143, 170]);
  });

  it('reconoce el vocabulario semantic_match del PDF', async () => {
    const section = await readGuideFor(complexDir, 'oferta_mantenimiento_integral.pdf');
    const semanticos = section.rows.filter((r) => r.relation === 'semantic_match');

    // El PDF trae 16 lineas con el prefijo "Equivalente tecnico" (lo verifica
    // pdf.test.ts) pero la guia solo documenta 14: le faltan la 143 y la 170.
    expect(semanticos).toHaveLength(14);
    expect(semanticos.map((r) => r.offerLineNo)).toEqual([
      11, 22, 33, 44, 55, 66, 77, 88, 99, 110, 121, 132, 154, 161,
    ]);
    expect(semanticos[0]).toMatchObject({ requisitionLineNo: 11, relation: 'semantic_match' });
  });

  it('los faltantes del PDF estan dispersos, no al final', async () => {
    const section = await readGuideFor(complexDir, 'oferta_mantenimiento_integral.pdf');
    const faltantes = section.rows
      .filter((r) => r.relation === 'missing_from_offer')
      .map((r) => r.requisitionLineNo);

    expect(faltantes).toHaveLength(48);
    // Si fueran contiguos al final, line_no del pedido y de la oferta
    // coincidirian siempre y el matching seria trivial.
    expect(faltantes[0]).toBe(156);
    expect(faltantes).toContain(168);
    expect(faltantes).toContain(220);
  });

  it('a partir de la linea 156 la numeracion deja de coincidir', async () => {
    const section = await readGuideFor(complexDir, 'oferta_mantenimiento_integral.pdf');
    const matches = expectedMatches(section);

    // Antes del primer faltante, oferta y pedido van a la par.
    expect(matches.get(100)).toBe(100);
    // Despues, no.
    const desalineadas = [...matches.entries()].filter(([offer, req]) => offer !== req);
    expect(desalineadas.length).toBeGreaterThan(10);
  });
});
