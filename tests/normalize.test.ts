import { describe, expect, it } from 'vitest';
import {
  embeddingText,
  normalizeUnit,
  parseArgNumber,
  parseDescription,
  parseNotes,
  requireArgNumber,
  stripAccents,
} from '../src/extract/normalize.js';
import { ExtractionError } from '../src/core/errors.js';

describe('parseArgNumber', () => {
  it('interpreta el formato es-AR con miles y decimales', () => {
    // Los tres casos borde que nombra la especificacion.
    expect(parseArgNumber('2.839,20')).toBe(2839.2);
    expect(parseArgNumber('47,53')).toBe(47.53);
    expect(parseArgNumber('129.010,00')).toBe(129010);
  });

  it('maneja varios separadores de miles', () => {
    expect(parseArgNumber('1.234.567,89')).toBe(1234567.89);
    expect(parseArgNumber('1.000')).toBe(1000);
    expect(parseArgNumber('1.000.000')).toBe(1000000);
  });

  it('trata el punto como decimal cuando no puede ser separador de miles', () => {
    // "1.5" no puede ser miles: no tiene tres digitos a la derecha.
    expect(parseArgNumber('1.5')).toBe(1.5);
    expect(parseArgNumber('0.75')).toBe(0.75);
    expect(parseArgNumber('12.3456')).toBe(12.3456);
  });

  it('acepta enteros y numeros nativos sin tocarlos', () => {
    expect(parseArgNumber('5200')).toBe(5200);
    expect(parseArgNumber(2839.2)).toBe(2839.2);
    expect(parseArgNumber(0)).toBe(0);
  });

  it('tolera moneda, espacios y signos', () => {
    expect(parseArgNumber('$ 2.839,20')).toBe(2839.2);
    expect(parseArgNumber('ARS 1.500,00')).toBe(1500);
    expect(parseArgNumber(' 47,53 ')).toBe(47.53);
    expect(parseArgNumber('-1.200,50')).toBe(-1200.5);
    // Espacio no separable, tipico de texto extraido de PDF.
    expect(parseArgNumber('2.839,20')).toBe(2839.2);
  });

  it('devuelve null para vacios', () => {
    expect(parseArgNumber('')).toBeNull();
    expect(parseArgNumber('   ')).toBeNull();
    expect(parseArgNumber('-')).toBeNull();
    expect(parseArgNumber(null)).toBeNull();
    expect(parseArgNumber(undefined)).toBeNull();
  });

  it('falla ruidosamente ante basura, en vez de devolver NaN', () => {
    expect(() => parseArgNumber('a confirmar')).toThrow(ExtractionError);
    expect(() => parseArgNumber('12 unidades')).toThrow(ExtractionError);
  });

  it('requireArgNumber exige valor', () => {
    expect(requireArgNumber('47,53')).toBe(47.53);
    expect(() => requireArgNumber('', { linea: 4 })).toThrow(ExtractionError);
  });

  it('nunca produce el bug de parseFloat', () => {
    // parseFloat('2.839,20') === 2.839 -> mil veces menos. Esto es lo que
    // este parser existe para evitar.
    expect(parseArgNumber('2.839,20')).not.toBe(parseFloat('2.839,20'));
  });
});

describe('normalizeUnit', () => {
  it('mapea las 18 unidades presentes en el dataset', () => {
    const esperado: Record<string, string> = {
      unidad: 'unit', metro: 'meter', rollo: 'roll', caja: 'box', bolsa: 'bag',
      paquete: 'pack', pack: 'pack', par: 'pair', set: 'set', kit: 'kit',
      lata: 'can', balde: 'bucket', bidon: 'drum', litro: 'liter',
      tubo: 'tube', cartucho: 'cartridge', hoja: 'sheet', pomo: 'jar',
    };
    for (const [raw, canonical] of Object.entries(esperado)) {
      expect(normalizeUnit(raw), `unidad "${raw}"`).toBe(canonical);
    }
  });

  it('acepta abreviaturas, plurales y mayusculas', () => {
    expect(normalizeUnit('u.')).toBe('unit');
    expect(normalizeUnit('UN')).toBe('unit');
    expect(normalizeUnit('Unidades')).toBe('unit');
    expect(normalizeUnit('mts')).toBe('meter');
    expect(normalizeUnit('  Metro  ')).toBe('meter');
    expect(normalizeUnit('bidón')).toBe('drum');
  });

  it('devuelve null si no reconoce la unidad', () => {
    expect(normalizeUnit('barril')).toBeNull();
    expect(normalizeUnit('')).toBeNull();
    expect(normalizeUnit(null)).toBeNull();
  });
});

describe('parseNotes', () => {
  it('mapea el vocabulario del PDF de Mantenimiento Integral', () => {
    expect(parseNotes('equivalente tecnico').flags).toEqual(['technical_equivalent']);
    expect(parseNotes('stock parcial').flags).toEqual(['partial_stock']);
    expect(parseNotes('bulto minimo de venta').flags).toEqual(['min_order_qty']);
    expect(parseNotes('marca a confirmar').flags).toEqual(['brand_to_confirm']);
    expect(parseNotes('adicional sugerido').flags).toEqual(['extra_suggested']);
    expect(parseNotes('adicional no pedido').flags).toEqual(['extra_suggested']);
    expect(parseNotes('equivalente alternativo').flags).toEqual(['alternative_line']);
  });

  it('mapea las variantes de redaccion del PDF de Comercial Oficinas', () => {
    // Cada proveedor escribe lo mismo distinto. Estas tres significan que hay
    // menos stock del pedido, que es peor para el comprador que redondear
    // hacia arriba por presentacion comercial.
    expect(parseNotes('cantidad menor a la solicitada').flags).toEqual(['partial_stock']);
    expect(parseNotes('cantidad disponible menor al pedido anual').flags).toEqual(['partial_stock']);
    expect(parseNotes('producto adicional no pedido').flags).toEqual(['extra_suggested']);
  });

  it('mapea el vocabulario del XLSX de Suministros Industriales', () => {
    expect(parseNotes('presentacion comercial superior').flags).toEqual(['min_order_qty']);
    expect(parseNotes('cantidad disponible menor al pedido anual').flags).toEqual(['partial_stock']);
    expect(parseNotes('sugerido para stock anual').flags).toEqual(['extra_suggested']);
    expect(parseNotes('alternativa para nave alta').flags).toEqual(['alternative_line']);
  });

  it('separa notas multiples por punto y coma', () => {
    const r = parseNotes('stock parcial; equivalente tecnico');
    expect(r.flags).toHaveLength(2);
    expect(r.flags).toContain('partial_stock');
    expect(r.flags).toContain('technical_equivalent');
    expect(r.unrecognized).toEqual([]);
  });

  it('no duplica flags', () => {
    expect(parseNotes('equivalente tecnico; equivalente tecnico').flags).toEqual([
      'technical_equivalent',
    ]);
  });

  it('reporta lo que no entiende en vez de tragarselo', () => {
    const r = parseNotes('entrega en 48hs');
    expect(r.flags).toEqual([]);
    expect(r.unrecognized).toEqual(['entrega en 48hs']);
  });

  it('nota vacia no genera nada', () => {
    expect(parseNotes('')).toEqual({ flags: [], unrecognized: [] });
    expect(parseNotes(null)).toEqual({ flags: [], unrecognized: [] });
  });
});

describe('parseDescription', () => {
  it('saca el prefijo "Equivalente tecnico" y lo convierte en flag', () => {
    const r = parseDescription('Equivalente tecnico Conductor flexible 4 mm2 verde amarillo');
    expect(r.description).toBe('Conductor flexible 4 mm2 verde amarillo');
    expect(r.flags).toEqual(['technical_equivalent']);
  });

  it('saca el sufijo "linea alternativa" y lo convierte en flag', () => {
    const r = parseDescription('Interruptor automatico 2 polos 16 A linea alternativa');
    expect(r.description).toBe('Interruptor automatico 2 polos 16 A');
    expect(r.flags).toEqual(['alternative_line']);
  });

  it('maneja prefijo y sufijo juntos', () => {
    const r = parseDescription('Equivalente tecnico Tecla doble embutir linea alternativa');
    expect(r.description).toBe('Tecla doble embutir');
    expect(r.flags).toHaveLength(2);
  });

  it('deja intacta una descripcion sin marcadores', () => {
    const r = parseDescription('Conductor flexible 1.5 mm2 rojo');
    expect(r.description).toBe('Conductor flexible 1.5 mm2 rojo');
    expect(r.flags).toEqual([]);
  });

  it('no confunde un producto que se llama parecido', () => {
    // "Equivalente" tiene que estar al principio y seguido de "tecnico".
    const r = parseDescription('Manual de equivalencias tecnicas');
    expect(r.description).toBe('Manual de equivalencias tecnicas');
    expect(r.flags).toEqual([]);
  });

  it('colapsa espacios de sobra del texto extraido del PDF', () => {
    expect(parseDescription('  Cable   unipolar  1.5mm2   rojo ').description).toBe(
      'Cable unipolar 1.5mm2 rojo',
    );
  });
});

describe('embeddingText', () => {
  it('normaliza a minusculas sin acentos e incorpora la unidad', () => {
    expect(embeddingText('Cañería PVC 110mm', 'meter')).toBe('caneria pvc 110mm [meter]');
  });

  it('omite la unidad si no se pudo normalizar', () => {
    expect(embeddingText('Resma papel A4 75g', null)).toBe('resma papel a4 75g');
  });
});

describe('stripAccents', () => {
  it('saca tildes y dieresis conservando la letra', () => {
    expect(stripAccents('Cañería con güiro áéíóú')).toBe('Caneria con guiro aeiou');
  });
});
