# Analisis de oferta: Comercial Oficinas del Sur

Solicitud **REQ-OFI-2026-001** - Compra puntual de insumos administrativos

## Resumen ejecutivo

| | |
|---|---|
| Proveedor | Comercial Oficinas del Sur |
| Cotizacion | COT-COS-2026-119 |
| Fecha | 2026-05-22 |
| Archivo | `oferta_comercial_oficinas.pdf` (PDF) |
| Condiciones | Propuesta parcial. Un articulo administrativo no se incluye por falta de disponibilidad. |

**Cobertura: 5 de 6 items pedidos (83.3%).**

### Desglose

| Estado | Lineas | Que significa |
|---|---:|---|
| Coincidencia | 3 | mismo producto y misma cantidad |
| Cantidad parcial | 2 | mismo producto, cantidad distinta a la pedida |
| No cotizado | 1 | pedido pero no cotizado |
| Sobrante | 1 | cotizado pero no pedido |

### Totales

| | |
|---|---:|
| Total cotizado por el proveedor | $ 1.306.020,00 |
| **Total comparable** (solo lo que se pidio) | **$ 888.420,00** |
| Sobrantes no pedidos | $ 417.600,00 |

> El total comparable es el que sirve para poner a este proveedor contra otro: los sobrantes no se pidieron y sumarlos inflaria la comparacion.

## Alertas

**1 linea(s) requieren revision del comprador.**

### No cotizados (1)

- **#3** Carpeta plastica A4 (200 unidad)

### Cotizados por debajo de lo pedido (2)

| Item | Pedido | Ofrecido | Falta |
|---|---:|---:|---:|
| #2 Boligrafo azul | 500 | 450 | 50 |
| #1 Resma papel A4 75g | 100 | 90 | 10 |

## Oferta procesada

Las 6 lineas extraidas del archivo original.

| # | Codigo | Descripcion | Cant. | Unidad | P. unitario | Subtotal | Observaciones |
|---:|---|---|---:|---|---:|---:|---|
| 1 | COS-00110 | Paquete de papel blanco tamanio A4 75 gramos | 90 | unidad | $ 5.044,00 | $ 453.960,00 | stock parcial |
| 2 | COS-00117 | Lapicera azul trazo medio economica | 450 | unidad | $ 187,20 | $ 84.240,00 | stock parcial |
| 3 | COS-00131 | Rotulador indeleble color negro | 50 | unidad | $ 988,00 | $ 49.400,00 |  |
| 4 | COS-00138 | Rollo cinta transparente de embalaje 48 mm | 100 | rollo | $ 1.261,00 | $ 126.100,00 |  |
| 5 | COS-00145 | Cuaderno A4 con tapa rigida | 40 | unidad | $ 4.368,00 | $ 174.720,00 |  |
| 6 | COS-77015 | Cartucho toner negro compatible | 12 | unidad | $ 34.800,00 | $ 417.600,00 | adicional sugerido |

## Tabla conciliada

Ordenada poniendo primero lo que requiere atencion.

| Item pedido | Linea ofertada | Estado | Cant. pedida | Cant. ofrecida | Delta | Confianza | Motivo |
|---|---|---|---:|---:|---:|---:|---|
| #3 Carpeta plastica A4 | - | No cotizado ⚠ | 200 | - | - | 1.00 | ninguna linea de la oferta corresponde a este item solicitado |
| #2 Boligrafo azul | L2 Lapicera azul trazo medio economica | Cantidad parcial | 500 | 450 | -50 | 0.90 | Lapicera azul es equivalente a boligrafo azul.. el proveedor ofrece 450 de las 500 pedidas (faltan 50) |
| #1 Resma papel A4 75g | L1 Paquete de papel blanco tamanio A4 75 gramos | Cantidad parcial | 100 | 90 | -10 | 0.95 | Paquete de papel A4 de 75g es equivalente a resma de papel A4 75g.. el proveedor ofrece 90 de las 100 pedidas (faltan 10) |
| - | L6 Cartucho toner negro compatible | Sobrante | - | 12 | - | 0.27 | el LLM determino que ninguno de los candidatos corresponde a esta linea |
| #4 Marcador permanente negro | L3 Rotulador indeleble color negro | Coincidencia | 50 | 50 | - | 0.92 | Rotulador indeleble color negro equivale a marcador permanente negro.. mismo producto y misma cantidad |
| #5 Cinta adhesiva transparente 48mm | L4 Rollo cinta transparente de embalaje 48 mm | Coincidencia | 100 | 100 | - | 0.95 | Cinta transparente de embalaje de 48mm coincide con la cinta adhesiva transparente de 48mm.. mismo producto y misma cantidad |
| #6 Cuaderno tapa dura A4 | L5 Cuaderno A4 con tapa rigida | Coincidencia | 40 | 40 | - | 0.95 | Cuaderno A4 con tapa rigida es equivalente a cuaderno tapa dura A4.. mismo producto y misma cantidad |

## Trazabilidad

### Extraccion

| | |
|---|---|
| Estrategia | llm+deterministic |
| Modelo | gemini-3.6-flash |
| Llamadas al LLM | 1 |
| Lotes | 1 |
| Tokens entrada / salida | 500 / 1667 |
| Duracion | 8140 ms |
| SHA-256 del archivo | `ae8cf44282a44732...` |

Sin avisos de extraccion.

### Conciliacion

| | |
|---|---|
| Estrategia | cascade-v1 |
| Modelo | gemini-3.6-flash |
| Resueltas por alias | 0 |
| Resueltas por LLM | 5 |
| Resueltas por similitud lexica | 0 |
| Conflictos resueltos | 0 |
| Llamadas al LLM | 1 en 1 lotes |
| Tokens entrada / salida | 1894 / 1162 |

### Volumen

Conciliar 6 lineas ofertadas contra 6 items solicitados por fuerza bruta serian **36 comparaciones**.

Con el prefiltro vectorial fueron **1 query indexada** (HNSW + distancia coseno, dentro de Postgres) en 863 ms, y el decisor evaluo 5 candidatos por linea en vez de 6.

---

Conciliacion `411a3cc2-8bde-4795-a197-a89f2ad84e3c` generada el 26/8/2026, 03:59:08.