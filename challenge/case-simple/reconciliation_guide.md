# Guia de relaciones esperadas: case-simple

Este archivo es una ayuda para entender los datos del escenario y validar manualmente el resultado esperado de conciliacion.

La aplicacion puede mostrar resultados parecidos a esta guia, pero no deberia depender de este archivo como input automatico. El objetivo sigue siendo procesar la solicitud y la oferta, extraer la informacion y resolver la conciliacion.

Criterio: las ofertas no comparten IDs de solicitud ni descripciones exactas; la relacion esperada se documenta aca para que puedas comprobar que cada oferta corresponde realmente a la solicitud.

## oferta_oficenter_norte.xlsx

- Items solicitados cubiertos: 6
- Items solicitados faltantes: 0
- Items sobrantes en oferta: 1

| item pedido | descripcion solicitada | cantidad pedida | linea oferta | codigo proveedor | descripcion ofertada | cantidad ofertada | relacion | explicacion |
|---:|---|---:|---:|---|---|---:|---|---|
| 1 | Resma papel A4 75g | 100 | 1 | OFN-00110 | Paquete de papel blanco tamanio A4 75 gramos | 100 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 2 | Boligrafo azul | 500 | 2 | OFN-00117 | Lapicera tinta azul punta media | 500 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 3 | Carpeta plastica A4 | 200 | 3 | OFN-00124 | Folder plastico para hojas A4 | 200 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 4 | Marcador permanente negro | 50 | 4 | OFN-00131 | Rotulador indeleble color negro | 50 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 5 | Cinta adhesiva transparente 48mm | 100 | 5 | OFN-00138 | Rollo cinta transparente de embalaje 48 mm | 120 | partial_quantity | presentacion comercial superior |
| 6 | Cuaderno tapa dura A4 | 40 | 6 | OFN-00145 | Cuaderno A4 con tapa rigida | 40 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
|  |  |  | 7 | OFN-88001 | Corrector liquido formato lapicera 7 ml | 60 | extra | producto adicional sugerido por proveedor |

## oferta_comercial_oficinas.pdf

- Items solicitados cubiertos: 5
- Items solicitados faltantes: 1
- Items sobrantes en oferta: 1

| item pedido | descripcion solicitada | cantidad pedida | linea oferta | codigo proveedor | descripcion ofertada | cantidad ofertada | relacion | explicacion |
|---:|---|---:|---:|---|---|---:|---|---|
| 1 | Resma papel A4 75g | 100 | 1 | COS-00110 | Paquete de papel blanco tamanio A4 75 gramos | 90 | partial_quantity | stock parcial |
| 2 | Boligrafo azul | 500 | 2 | COS-00117 | Lapicera azul trazo medio economica | 450 | partial_quantity | cantidad menor a la solicitada |
| 3 | Carpeta plastica A4 | 200 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial |
| 4 | Marcador permanente negro | 50 | 3 | COS-00131 | Rotulador indeleble color negro | 50 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 5 | Cinta adhesiva transparente 48mm | 100 | 4 | COS-00138 | Rollo cinta transparente de embalaje 48 mm | 100 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 6 | Cuaderno tapa dura A4 | 40 | 5 | COS-00145 | Cuaderno A4 con tapa rigida | 40 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
|  |  |  | 6 | COS-77015 | Cartucho toner negro compatible | 12 | extra | producto adicional no pedido |
