# Analisis de oferta: Oficenter Norte SA

Solicitud **REQ-OFI-2026-001** - Compra puntual de insumos administrativos

## Resumen ejecutivo

| | |
|---|---|
| Proveedor | Oficenter Norte SA |
| Cotizacion | COT-OFN-2026-051 |
| Fecha | 2026-05-20 |
| Archivo | `oferta_oficenter_norte.xlsx` (XLSX) |
| Condiciones | Entrega estimada dentro de 7 dias habiles. Valores unitarios sujetos a stock al momento de la orden. |

**Cobertura: 6 de 6 items pedidos (100.0%).**

### Desglose

| Estado | Lineas | Que significa |
|---|---:|---|
| Coincidencia | 5 | mismo producto y misma cantidad |
| Cantidad parcial | 1 | mismo producto, cantidad distinta a la pedida |
| Sobrante | 1 | cotizado pero no pedido |

### Totales

| | |
|---|---:|
| Total cotizado por el proveedor | $ 1.182.900,00 |
| **Total comparable** (solo lo que se pidio) | **$ 1.129.500,00** |
| Sobrantes no pedidos | $ 53.400,00 |

> El total comparable es el que sirve para poner a este proveedor contra otro: los sobrantes no se pidieron y sumarlos inflaria la comparacion.

## Alertas

**0 linea(s) requieren revision del comprador.**

## Oferta procesada

Las 7 lineas extraidas del archivo original.

| # | Codigo | Descripcion | Cant. | Unidad | P. unitario | Subtotal | Observaciones |
|---:|---|---|---:|---|---:|---:|---|
| 1 | OFN-00110 | Paquete de papel blanco tamanio A4 75 gramos | 100 | unidad | $ 5.200,00 | $ 520.000,00 |  |
| 2 | OFN-00117 | Lapicera tinta azul punta media | 500 | unidad | $ 180,00 | $ 90.000,00 |  |
| 3 | OFN-00124 | Folder plastico para hojas A4 | 200 | unidad | $ 740,00 | $ 148.000,00 |  |
| 4 | OFN-00131 | Rotulador indeleble color negro | 50 | unidad | $ 950,00 | $ 47.500,00 |  |
| 5 | OFN-00138 | Rollo cinta transparente de embalaje 48 mm | 120 | rollo | $ 1.300,00 | $ 156.000,00 | bulto minimo |
| 6 | OFN-00145 | Cuaderno A4 con tapa rigida | 40 | unidad | $ 4.200,00 | $ 168.000,00 |  |
| 7 | OFN-88001 | Corrector liquido formato lapicera 7 ml | 60 | unidad | $ 890,00 | $ 53.400,00 | adicional sugerido |

## Tabla conciliada

Ordenada poniendo primero lo que requiere atencion.

| Item pedido | Linea ofertada | Estado | Cant. pedida | Cant. ofrecida | Delta | Confianza | Motivo |
|---|---|---|---:|---:|---:|---:|---|
| #5 Cinta adhesiva transparente 48mm | L5 Rollo cinta transparente de embalaje 48 mm | Cantidad parcial | 100 | 120 | +20 | 0.95 | Coincide plenamente en tipo de cinta, transparencia y medida de 48mm.. el proveedor ofrece 120 contra 100 pedidas (20 de mas, probable presentacion comercial) |
| - | L7 Corrector liquido formato lapicera 7 ml | Sobrante | - | 60 | - | 0.30 | el LLM determino que ninguno de los candidatos corresponde a esta linea |
| #2 Boligrafo azul | L2 Lapicera tinta azul punta media | Coincidencia | 500 | 500 | - | 0.92 | Lapicera de tinta azul equivale exactamente a boligrafo azul.. mismo producto y misma cantidad |
| #1 Resma papel A4 75g | L1 Paquete de papel blanco tamanio A4 75 gramos | Coincidencia | 100 | 100 | - | 0.95 | El paquete de papel blanco A4 de 75g equivale a la resma de papel A4 de 75g.. mismo producto y misma cantidad |
| #3 Carpeta plastica A4 | L3 Folder plastico para hojas A4 | Coincidencia | 200 | 200 | - | 0.95 | Folder plastico para hojas A4 es sinonimo de carpeta plastica A4.. mismo producto y misma cantidad |
| #4 Marcador permanente negro | L4 Rotulador indeleble color negro | Coincidencia | 50 | 50 | - | 0.95 | Rotulador indeleble negro es equivalente a marcador permanente negro.. mismo producto y misma cantidad |
| #6 Cuaderno tapa dura A4 | L6 Cuaderno A4 con tapa rigida | Coincidencia | 40 | 40 | - | 0.95 | Cuaderno A4 con tapa rigida equivale a cuaderno tapa dura A4.. mismo producto y misma cantidad |

## Trazabilidad

### Extraccion

| | |
|---|---|
| Estrategia | deterministic |
| Modelo | ninguno (deterministico) |
| Llamadas al LLM | 0 |
| Lotes | 0 |
| Tokens entrada / salida | 0 / 0 |
| Duracion | 23 ms |
| SHA-256 del archivo | `d4bb3b0cc0cbde18...` |

Sin avisos de extraccion.

### Conciliacion

| | |
|---|---|
| Estrategia | cascade-v1 |
| Modelo | gemini-3.6-flash |
| Resueltas por alias | 0 |
| Resueltas por LLM | 6 |
| Resueltas por similitud lexica | 0 |
| Conflictos resueltos | 0 |
| Llamadas al LLM | 1 en 1 lotes |
| Tokens entrada / salida | 2124 / 1601 |

### Volumen

Conciliar 7 lineas ofertadas contra 6 items solicitados por fuerza bruta serian **42 comparaciones**.

Con el prefiltro vectorial fueron **1 query indexada** (HNSW + distancia coseno, dentro de Postgres) en 556 ms, y el decisor evaluo 5 candidatos por linea en vez de 6.

---

Conciliacion `3c993459-621c-461f-9819-e6ccbd04fd38` generada el 26/8/2026, 10:18:40.