# Guia de relaciones esperadas: case-complex

Este archivo es una ayuda para entender los datos del escenario y validar manualmente el resultado esperado de conciliacion.

La aplicacion puede mostrar resultados parecidos a esta guia, pero no deberia depender de este archivo como input automatico. El objetivo sigue siendo procesar la solicitud y la oferta, extraer la informacion y resolver la conciliacion.

Criterio: las ofertas no comparten IDs de solicitud ni descripciones exactas; la relacion esperada se documenta aca para que puedas comprobar que cada oferta corresponde realmente a la solicitud.

## oferta_suministros_industriales.xlsx

- Items solicitados cubiertos: 220
- Items solicitados faltantes: 0
- Items sobrantes en oferta: 5

| item pedido | descripcion solicitada | cantidad pedida | linea oferta | codigo proveedor | descripcion ofertada | cantidad ofertada | relacion | explicacion |
|---:|---|---:|---:|---|---|---:|---|---|
| 1 | Cable unipolar 1.5mm2 rojo | 1000 | 1 | SIP-00110 | Conductor flexible 1.5 mm2 rojo | 1000 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 2 | Cable unipolar 1.5mm2 azul | 1000 | 2 | SIP-00117 | Conductor flexible 1.5 mm2 azul | 1000 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 3 | Cable unipolar 1.5mm2 verde amarillo | 800 | 3 | SIP-00124 | Conductor flexible 1.5 mm2 verde amarillo | 800 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 4 | Cable unipolar 1.5mm2 negro | 800 | 4 | SIP-00131 | Conductor flexible 1.5 mm2 negro | 800 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 5 | Cable unipolar 2.5mm2 rojo | 1500 | 5 | SIP-00138 | Conductor flexible 2.5 mm2 rojo | 1500 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 6 | Cable unipolar 2.5mm2 azul | 1500 | 6 | SIP-00145 | Conductor flexible 2.5 mm2 azul | 1500 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 7 | Cable unipolar 2.5mm2 verde amarillo | 1200 | 7 | SIP-00152 | Conductor flexible 2.5 mm2 verde amarillo | 1200 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 8 | Cable unipolar 2.5mm2 negro | 1200 | 8 | SIP-00159 | Conductor flexible 2.5 mm2 negro | 1200 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 9 | Cable unipolar 4mm2 rojo | 800 | 9 | SIP-00166 | Conductor flexible 4 mm2 rojo | 800 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 10 | Cable unipolar 4mm2 azul | 800 | 10 | SIP-00173 | Conductor flexible 4 mm2 azul | 800 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 11 | Cable unipolar 4mm2 verde amarillo | 600 | 11 | SIP-00180 | Conductor flexible 4 mm2 verde amarillo | 600 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 12 | Canaleta PVC 20x10 blanca | 300 | 12 | SIP-00187 | Ducto polipropileno pasacable 20x10 blanca | 300 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 13 | Canaleta PVC 40x20 blanca | 200 | 13 | SIP-00194 | Ducto polipropileno pasacable 40x20 blanca | 200 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 14 | Caja derivacion PVC 10x10 | 150 | 14 | SIP-00201 | Caja de paso plastica 10x10 | 150 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 15 | Caja estanca IP65 | 120 | 15 | SIP-00208 | Gabinete estanco IP65 | 120 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 16 | Llave termomagnetica bipolar 10A | 40 | 16 | SIP-00215 | Interruptor automatico 2 polos 10 A | 40 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 17 | Llave termomagnetica bipolar 16A | 60 | 17 | SIP-00222 | Interruptor automatico 2 polos 16 A | 60 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 18 | Llave termomagnetica bipolar 25A | 60 | 18 | SIP-00229 | Interruptor automatico 2 polos 25 A | 54 | partial_quantity | cantidad disponible menor al pedido anual |
| 19 | Llave termomagnetica bipolar 32A | 40 | 19 | SIP-00236 | Interruptor automatico 2 polos 32 A | 40 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 20 | Disyuntor diferencial bipolar 25A 30mA | 35 | 20 | SIP-00243 | Protector diferencial 2 polos 25 A 30 mA | 35 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 21 | Disyuntor diferencial bipolar 40A 30mA | 25 | 21 | SIP-00250 | Protector diferencial 2 polos 40 A 30 mA | 25 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 22 | Tomacorriente doble 10A blanco | 250 | 22 | SIP-00257 | Modulo toma electrica doble 10 A blanco | 250 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 23 | Tomacorriente industrial 16A | 80 | 23 | SIP-00264 | Modulo toma electrica industrial 16 A | 80 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 24 | Ficha macho 10A | 150 | 24 | SIP-00271 | Plug macho 10 A | 150 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 25 | Ficha hembra 10A | 150 | 25 | SIP-00278 | Conector hembra 10 A | 150 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 26 | Prolongador electrico 10m | 30 | 26 | SIP-00285 | Alargue electrico 10 m | 30 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 27 | Zapatilla electrica 6 tomas | 60 | 27 | SIP-00292 | Base multiple 6 tomas | 60 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 28 | Cinta aisladora negra | 300 | 28 | SIP-00299 | Rollo aislante negra | 300 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 29 | Cinta aisladora roja | 80 | 29 | SIP-00306 | Rollo aislante roja | 80 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 30 | Precinto plastico 200mm | 200 | 30 | SIP-00313 | Brida plastica 200 mm | 220 | partial_quantity | presentacion comercial superior |
| 31 | Precinto plastico 300mm | 150 | 31 | SIP-00320 | Brida plastica 300 mm | 150 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 32 | Bornera 12 polos 10mm | 100 | 32 | SIP-00327 | Regleta de conexion 12 polos 10 mm | 100 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 33 | Terminal ojal aislado rojo | 1000 | 33 | SIP-00334 | Terminal anillo aislado rojo | 1000 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 34 | Terminal pala aislado azul | 1000 | 34 | SIP-00341 | Terminal faston pala aislado azul | 1000 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 35 | Multimetro digital basico | 12 | 35 | SIP-00348 | Tester digital basico | 12 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 36 | Tubo LED T8 18W luz fria | 500 | 36 | SIP-00355 | Lampara tubular LED T8 18 W luz fria | 500 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 37 | Panel LED 60x60 40W | 150 | 37 | SIP-00362 | Placa luminosa LED 60x60 40 W | 150 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 38 | Lampara LED E27 12W | 300 | 38 | SIP-00369 | Bulbo LED E27 12 W | 300 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 39 | Lampara LED E27 18W | 200 | 39 | SIP-00376 | Bulbo LED E27 18 W | 200 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 40 | Reflector LED exterior 100W IP65 | 80 | 40 | SIP-00383 | Proyector LED uso externo 100 W IP65 | 72 | partial_quantity | cantidad disponible menor al pedido anual |
| 41 | Sensor movimiento pared | 70 | 41 | SIP-00390 | Detector de presencia pared | 70 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 42 | Fotocelula exterior | 50 | 42 | SIP-00397 | Celula fotoelectrica uso externo | 50 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 43 | Porta lampara E27 | 100 | 43 | SIP-00404 | Portalamp E27 | 100 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 44 | Driver panel LED 40W | 80 | 44 | SIP-00411 | Fuente para placa LED 40 W | 80 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 45 | Aplique emergencia LED | 120 | 45 | SIP-00418 | Luminaria autonoma emergencia LED | 120 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 46 | Cartel salida emergencia LED | 60 | 46 | SIP-00425 | Senal luminosa salida emergencia | 60 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 47 | Cinta LED 12V 5m | 40 | 47 | SIP-00432 | Tira LED 12 V 5 m | 40 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 48 | Fuente switching 12V 5A | 30 | 48 | SIP-00439 | Fuente conmutada 12 V 5 A | 30 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 49 | Tubo corrugado liviano 3/4 | 500 | 49 | SIP-00446 | Canio flexible corrugado liviano 3/4 | 500 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 50 | Tubo corrugado pesado 1 pulgada | 300 | 50 | SIP-00453 | Canio flexible corrugado pesado 1 pulgada | 300 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 51 | Conector corrugado 3/4 | 200 | 51 | SIP-00460 | Acople para corrugado 3/4 | 200 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 52 | Conector corrugado 1 pulgada | 150 | 52 | SIP-00467 | Acople para corrugado 1 pulgada | 150 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 53 | Cable taller 3x2.5mm2 | 300 | 53 | SIP-00474 | Cable multipolar uso taller 3x2.5 mm2 | 300 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 54 | Interruptor simple embutir | 180 | 54 | SIP-00481 | Tecla simple embutir | 180 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 55 | Interruptor doble embutir | 120 | 55 | SIP-00488 | Tecla doble embutir | 120 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 56 | Cano PVC agua 1/2 | 300 | 56 | SIP-00495 | Tuberia PVC presion 1/2 | 300 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 57 | Cano PVC agua 3/4 | 250 | 57 | SIP-00502 | Tuberia PVC presion 3/4 | 250 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 58 | Cano PVC agua 1 pulgada | 150 | 58 | SIP-00509 | Tuberia PVC presion 1 pulgada | 150 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 59 | Codo PVC 1/2 | 300 | 59 | SIP-00516 | Curva PVC 1/2 | 300 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 60 | Codo PVC 3/4 | 250 | 60 | SIP-00523 | Curva PVC 3/4 | 250 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 61 | Tee PVC 1/2 | 200 | 61 | SIP-00530 | T PVC 1/2 | 200 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 62 | Tee PVC 3/4 | 150 | 62 | SIP-00537 | T PVC 3/4 | 150 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 63 | Union doble PVC 1/2 | 120 | 63 | SIP-00544 | Cupla union PVC 1/2 | 120 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 64 | Union doble PVC 3/4 | 100 | 64 | SIP-00551 | Cupla union PVC 3/4 | 100 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 65 | Valvula esferica 1/2 | 120 | 65 | SIP-00558 | Llave de paso esferica 1/2 | 120 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 66 | Valvula esferica 3/4 | 100 | 66 | SIP-00565 | Llave de paso esferica 3/4 | 100 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 67 | Flexible sanitario 40cm | 180 | 67 | SIP-00572 | Conexion flexible sanitaria 40 cm | 180 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 68 | Flexible sanitario 60cm | 120 | 68 | SIP-00579 | Conexion flexible sanitaria 60 cm | 120 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 69 | Canilla lavatorio cierre ceramico | 60 | 69 | SIP-00586 | Griferia para lavatorio cierre ceramico | 60 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 70 | Canilla servicio bronce 1/2 | 80 | 70 | SIP-00593 | Grifo de servicio bronce 1/2 | 80 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 71 | Sifon plastico lavatorio | 90 | 71 | SIP-00600 | Desague sifonado polipropileno lavatorio | 90 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 72 | Flotante deposito inodoro | 70 | 72 | SIP-00607 | Valvula flotante deposito inodoro | 70 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 73 | Kit reparacion mochila inodoro | 80 | 73 | SIP-00614 | Conjunto reparacion mochila inodoro | 80 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 74 | Sellador roscas anaerobico | 60 | 74 | SIP-00621 | Traba rosca selladora anaerobico | 60 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 75 | Cinta teflon | 300 | 75 | SIP-00628 | Rollo PTFE | 270 | partial_quantity | cantidad disponible menor al pedido anual |
| 76 | Adhesivo PVC 125ml | 100 | 76 | SIP-00635 | Pegamento para PVC 125 ml | 100 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 77 | Limpiador PVC 125ml | 80 | 77 | SIP-00642 | Primer limpiador PVC 125 ml | 80 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 78 | Rejilla piso acero inoxidable | 100 | 78 | SIP-00649 | Rejilla de desague acero inoxidable | 100 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 79 | Tapa inspeccion PVC | 60 | 79 | SIP-00656 | Tapa registro PVC | 60 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 80 | Manguera reforzada 3/4 | 400 | 80 | SIP-00663 | Manguera tramada 3/4 | 400 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 81 | Tornillo autoperforante 8x1 | 5000 | 81 | SIP-00670 | Fijacion autoperforante 8x1 | 5000 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 82 | Tornillo autoperforante 8x1.5 | 5000 | 82 | SIP-00677 | Fijacion autoperforante 8x1.5 | 5000 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 83 | Tornillo madera 6x1 | 4000 | 83 | SIP-00684 | Fijacion para madera 6x1 | 4000 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 84 | Tornillo madera 8x2 | 4000 | 84 | SIP-00691 | Fijacion para madera 8x2 | 4000 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 85 | Tarugo nylon 6mm | 6000 | 85 | SIP-00698 | Anclaje nylon 6 mm | 6000 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 86 | Tarugo nylon 8mm | 6000 | 86 | SIP-00705 | Anclaje nylon 8 mm | 6000 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 87 | Tarugo nylon 10mm | 3000 | 87 | SIP-00712 | Anclaje nylon 10 mm | 3000 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 88 | Arandela plana 1/4 | 5000 | 88 | SIP-00719 | Arandela lisa 1/4 | 5500 | partial_quantity | presentacion comercial superior |
| 89 | Tuerca hexagonal 1/4 | 5000 | 89 | SIP-00726 | Tuerca HEX 1/4 | 5000 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 90 | Varilla roscada 1/4 | 300 | 90 | SIP-00733 | Esparrago roscado 1/4 | 300 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 91 | Varilla roscada 3/8 | 200 | 91 | SIP-00740 | Esparrago roscado 3/8 | 200 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 92 | Remache pop 4mm | 4000 | 92 | SIP-00747 | Remache aluminio pop 4 mm | 4000 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 93 | Abrazadera metalica 1/2 | 1000 | 93 | SIP-00754 | Grapa metalica 1/2 | 1000 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 94 | Abrazadera metalica 3/4 | 1000 | 94 | SIP-00761 | Grapa metalica 3/4 | 1000 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 95 | Abrazadera omega 3/4 | 800 | 95 | SIP-00768 | Grapa omega 3/4 | 800 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 96 | Broca HSS 4mm | 200 | 96 | SIP-00775 | Mecha HSS 4 mm | 200 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 97 | Broca HSS 6mm | 200 | 97 | SIP-00782 | Mecha HSS 6 mm | 200 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 98 | Broca HSS 8mm | 120 | 98 | SIP-00789 | Mecha HSS 8 mm | 120 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 99 | Broca pared 6mm | 150 | 99 | SIP-00796 | Mecha widia 6 mm | 150 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 100 | Broca pared 8mm | 150 | 100 | SIP-00803 | Mecha widia 8 mm | 150 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 101 | Disco corte metal 115mm | 400 | 101 | SIP-00810 | Disco de corte metal 115 mm | 400 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 102 | Disco desbaste metal 115mm | 200 | 102 | SIP-00817 | Disco para desbastar metal 115 mm | 200 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 103 | Disco corte inoxidable 115mm | 300 | 103 | SIP-00824 | Disco de corte inoxidable 115 mm | 300 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 104 | Hoja sierra manual 24T | 200 | 104 | SIP-00831 | Sierra manual hoja manual 24T | 200 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 105 | Lija al agua grano 120 | 500 | 105 | SIP-00838 | Pliego lija agua grano 120 | 500 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 106 | Lija al agua grano 220 | 500 | 106 | SIP-00845 | Pliego lija agua grano 220 | 500 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 107 | Lija madera grano 80 | 300 | 107 | SIP-00852 | Pliego lija madera grano 80 | 300 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 108 | Bisagra comun 2 pulgadas | 300 | 108 | SIP-00859 | Bisagra standard 2 in | 300 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 109 | Bisagra comun 3 pulgadas | 250 | 109 | SIP-00866 | Bisagra standard 3 in | 250 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 110 | Candado 40mm | 100 | 110 | SIP-00873 | Cierre candado 40 mm | 100 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 111 | Candado 50mm | 80 | 111 | SIP-00880 | Cierre candado 50 mm | 80 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 112 | Cierre pasador zincado | 150 | 112 | SIP-00887 | Pasador zincado zincado | 150 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 113 | Rueda giratoria 50mm | 120 | 113 | SIP-00894 | Rueda pivotante 50 mm | 120 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 114 | Rueda fija 50mm | 120 | 114 | SIP-00901 | Rueda rigida 50 mm | 120 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 115 | Escuadra metalica 100x100 | 200 | 115 | SIP-00908 | Angulo escuadra metalico 100x100 | 200 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 116 | Pintura latex interior blanca 20L | 80 | 116 | SIP-00915 | Latex acrilico uso interno blanca 20 L | 80 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 117 | Pintura latex interior gris claro 20L | 30 | 117 | SIP-00922 | Latex acrilico uso interno gris claro 20 L | 30 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 118 | Esmalte sintetico blanco 4L | 80 | 118 | SIP-00929 | Sintetico brillante blanco 4 L | 72 | partial_quantity | cantidad disponible menor al pedido anual |
| 119 | Esmalte sintetico negro 4L | 50 | 119 | SIP-00936 | Sintetico brillante negro 4 L | 50 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 120 | Esmalte sintetico amarillo seguridad 4L | 40 | 120 | SIP-00943 | Sintetico brillante amarillo seguridad 4 L | 40 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 121 | Esmalte sintetico rojo seguridad 4L | 30 | 121 | SIP-00950 | Sintetico brillante rojo seguridad 4 L | 30 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 122 | Pintura demarcacion amarilla 10L | 40 | 122 | SIP-00957 | Revestimiento para demarcar amarilla 10 L | 40 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 123 | Antioxido convertidor gris 4L | 60 | 123 | SIP-00964 | Convertidor de oxido gris 4 L | 60 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 124 | Enduido interior 20kg | 50 | 124 | SIP-00971 | Masilla enduido 20 kg | 50 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 125 | Masilla plastica multiuso 1kg | 80 | 125 | SIP-00978 | Masilla poliester multiuso 1 kg | 80 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 126 | Sellador siliconado transparente 280ml | 200 | 126 | SIP-00985 | Silicona selladora cristal 280 ml | 200 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 127 | Sellador siliconado blanco 280ml | 200 | 127 | SIP-00992 | Silicona selladora blanco 280 ml | 200 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 128 | Adhesivo montaje 300ml | 120 | 128 | SIP-00999 | Pegamento montaje 300 ml | 120 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 129 | Pegamento contacto 1L | 70 | 129 | SIP-01006 | Adhesivo contacto 1 L | 70 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 130 | Aerosol lubricante multiuso 400ml | 200 | 130 | SIP-01013 | Lubricante aerosol multiuso 400 ml | 220 | partial_quantity | presentacion comercial superior |
| 131 | Desengrasante industrial 5L | 100 | 131 | SIP-01020 | Desengrase industrial 5 L | 100 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 132 | Alcohol isopropilico 1L | 120 | 132 | SIP-01027 | IPA limpieza tecnica 1 L | 120 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 133 | Removedor pintura gel 1L | 30 | 133 | SIP-01034 | Removedor gel pintura gel 1 L | 30 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 134 | Pincel 2 pulgadas | 150 | 134 | SIP-01041 | Brocha 2 in | 150 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 135 | Pincel 3 pulgadas | 150 | 135 | SIP-01048 | Brocha 3 in | 150 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 136 | Rodillo lana 22cm | 120 | 136 | SIP-01055 | Rodillo pelo lana 22 cm | 120 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 137 | Bandeja pintura plastica | 60 | 137 | SIP-01062 | Cubeta pintura plastica | 60 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 138 | Cinta enmascarar 24mm | 500 | 138 | SIP-01069 | Cinta de pintor 24 mm | 500 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 139 | Cinta enmascarar 48mm | 400 | 139 | SIP-01076 | Cinta de pintor 48 mm | 400 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 140 | Nylon cobertura 4x5m | 100 | 140 | SIP-01083 | Film protector 4x5 m | 100 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 141 | Detergente concentrado 5L | 120 | 141 | SIP-01090 | Limpiador detergente concentrado 5 L | 120 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 142 | Lavandina 5L | 200 | 142 | SIP-01097 | Hipoclorito 5 L | 200 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 143 | Limpiador desinfectante 5L | 160 | 143 | SIP-01104 | Sanitizante limpiador 5 L | 160 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 144 | Limpiavidrios 5L | 80 | 144 | SIP-01111 | Limpia cristales 5 L | 80 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 145 | Desengrasante cocina 5L | 80 | 145 | SIP-01118 | Desengrase cocina 5 L | 80 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 146 | Jabon liquido manos 5L | 150 | 146 | SIP-01125 | Jabon para manos 5 L | 150 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 147 | Alcohol en gel 5L | 120 | 147 | SIP-01132 | Gel alcohol 5 L | 120 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 148 | Papel higienico industrial 300m | 600 | 148 | SIP-01139 | Higienico jumbo industrial 300 m | 600 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 149 | Toalla papel interfoliada | 300 | 149 | SIP-01146 | Papel toalla interfoliada | 300 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 150 | Bolsa residuos negra 60x90 | 1000 | 150 | SIP-01153 | Bolsa basura negra 60x90 | 900 | partial_quantity | cantidad disponible menor al pedido anual |
| 151 | Bolsa residuos consorcio 80x110 | 800 | 151 | SIP-01160 | Bolsa basura consorcio 80x110 | 800 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 152 | Trapo piso algodon | 500 | 152 | SIP-01167 | Pano piso algodon | 500 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 153 | Repuesto mopa microfibra | 200 | 153 | SIP-01174 | Recambio mopa microfibra | 200 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 154 | Cabo aluminio 1.4m | 150 | 154 | SIP-01181 | Mango aluminio 1.4 m | 150 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 155 | Escoba interior | 180 | 155 | SIP-01188 | Escoba uso interno | 180 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 156 | Escoba exterior dura | 120 | 156 | SIP-01195 | Escoba patio dura | 120 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 157 | Secador piso goma 50cm | 120 | 157 | SIP-01202 | Secapiso goma 50 cm | 120 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 158 | Balde plastico 12L | 100 | 158 | SIP-01209 | Cubeta plastica 12 L | 100 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 159 | Pulverizador manual 1L | 120 | 159 | SIP-01216 | Rociador manual 1 L | 120 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 160 | Guante limpieza latex talle M | 300 | 160 | SIP-01223 | Guante aseo latex talle M | 300 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 161 | Guante limpieza latex talle L | 300 | 161 | SIP-01230 | Guante aseo latex talle L | 300 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 162 | Esponja abrasiva | 1000 | 162 | SIP-01237 | Esponja fibra abrasiva | 1000 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 163 | Fibra verde limpieza | 1000 | 163 | SIP-01244 | Fibra verde | 1000 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 164 | Cera piso alto transito 5L | 80 | 164 | SIP-01251 | Cera para pisos alto transito 5 L | 80 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 165 | Desodorante ambiente aerosol 360ml | 300 | 165 | SIP-01258 | Aromatizador ambiente aerosol 360 ml | 300 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 166 | Guante moteado talle M | 600 | 166 | SIP-01265 | Guante tejido con puntos talle M | 600 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 167 | Guante moteado talle L | 600 | 167 | SIP-01272 | Guante tejido con puntos talle L | 600 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 168 | Guante nitrilo descartable talle M | 200 | 168 | SIP-01279 | Guante nitrilo examen desc. talle M | 200 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 169 | Guante nitrilo descartable talle L | 200 | 169 | SIP-01286 | Guante nitrilo examen desc. talle L | 200 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 170 | Guante cuero descarne | 300 | 170 | SIP-01293 | Guante descarne cuero descarne | 300 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 171 | Anteojo seguridad transparente | 400 | 171 | SIP-01300 | Gafa proteccion cristal | 440 | partial_quantity | presentacion comercial superior |
| 172 | Anteojo seguridad gris | 200 | 172 | SIP-01307 | Gafa proteccion gris | 200 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 173 | Protector auditivo tipo copa | 150 | 173 | SIP-01314 | Proteccion auditiva tipo copa | 150 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 174 | Protector auditivo endoaural descartable | 300 | 174 | SIP-01321 | Proteccion auditiva endoaural desc. | 300 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 175 | Casco seguridad blanco | 120 | 175 | SIP-01328 | Casco obra blanco | 120 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 176 | Casco seguridad amarillo | 80 | 176 | SIP-01335 | Casco obra amarillo | 80 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 177 | Barbijo descartable triple capa | 300 | 177 | SIP-01342 | Mascarilla desc. triple capa | 300 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 178 | Respirador media cara | 30 | 178 | SIP-01349 | Semimascara respiratoria | 30 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 179 | Filtro respirador particulas P100 | 120 | 179 | SIP-01356 | Cartucho filtro particulas P100 | 120 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 180 | Chaleco reflectivo talle M | 150 | 180 | SIP-01363 | Chaleco alta visibilidad talle M | 150 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 181 | Chaleco reflectivo talle L | 150 | 181 | SIP-01370 | Chaleco alta visibilidad talle L | 150 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 182 | Zapato seguridad talle 39 | 30 | 182 | SIP-01377 | Calzado de seguridad talle 39 | 30 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 183 | Zapato seguridad talle 40 | 40 | 183 | SIP-01384 | Calzado de seguridad talle 40 | 36 | partial_quantity | cantidad disponible menor al pedido anual |
| 184 | Zapato seguridad talle 41 | 50 | 184 | SIP-01391 | Calzado de seguridad talle 41 | 50 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 185 | Zapato seguridad talle 42 | 50 | 185 | SIP-01398 | Calzado de seguridad talle 42 | 50 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 186 | Zapato seguridad talle 43 | 40 | 186 | SIP-01405 | Calzado de seguridad talle 43 | 40 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 187 | Botiquin primeros auxilios | 20 | 187 | SIP-01412 | Maletin primeros auxilios | 20 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 188 | Recarga botiquin completa | 40 | 188 | SIP-01419 | Reposicion botiquin completa | 40 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 189 | Cinta peligro amarillo negro | 300 | 189 | SIP-01426 | Cinta advertencia amarillo negro | 300 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 190 | Cono vial reflectivo 70cm | 100 | 190 | SIP-01433 | Cono transito reflectivo 70 cm | 100 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 191 | Destornillador plano 4mm | 80 | 191 | SIP-01440 | Desarmador plano 4 mm | 80 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 192 | Destornillador plano 6mm | 80 | 192 | SIP-01447 | Desarmador plano 6 mm | 80 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 193 | Destornillador Phillips PH1 | 80 | 193 | SIP-01454 | Desarmador Phillips PH1 | 80 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 194 | Destornillador Phillips PH2 | 80 | 194 | SIP-01461 | Desarmador Phillips PH2 | 80 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 195 | Alicate corte diagonal | 50 | 195 | SIP-01468 | Alicate diagonal diagonal | 50 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 196 | Pinza universal | 50 | 196 | SIP-01475 | Pinza combinada | 50 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 197 | Pinza punta | 40 | 197 | SIP-01482 | Alicate de punta fina | 40 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 198 | Llave francesa 8 pulgadas | 40 | 198 | SIP-01489 | Llave ajustable 8 in | 40 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 199 | Llave francesa 12 pulgadas | 30 | 199 | SIP-01496 | Llave ajustable 12 in | 30 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 200 | Juego llaves combinadas 8 a 19mm | 25 | 200 | SIP-01503 | Set llaves combinadas 8 a 19 mm | 25 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 201 | Juego llaves Allen metricas | 30 | 201 | SIP-01510 | Set llaves Allen metricas | 30 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 202 | Martillo carpintero 16oz | 40 | 202 | SIP-01517 | Martillo una 16oz | 40 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 203 | Maza goma 500g | 30 | 203 | SIP-01524 | Mazo goma 500g | 30 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 204 | Cutter reforzado | 100 | 204 | SIP-01531 | Cuchilla retractil reforzada | 100 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 205 | Repuesto hoja cutter 18mm | 300 | 205 | SIP-01538 | Hojas repuesto cutter 18 mm | 300 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 206 | Cinta metrica 5m | 80 | 206 | SIP-01545 | Flexometro 5 m | 88 | partial_quantity | presentacion comercial superior |
| 207 | Nivel aluminio 60cm | 25 | 207 | SIP-01552 | Nivel burbuja 60 cm | 25 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 208 | Pistola silicona manual | 30 | 208 | SIP-01559 | Aplicador cartucho manual | 30 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 209 | Taladro percutor 650W | 12 | 209 | SIP-01566 | Taladro impacto 650 W | 12 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 210 | Amoladora angular 115mm | 12 | 210 | SIP-01573 | Esmeril angular 115 mm | 12 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 211 | Atornillador bateria 18V | 10 | 211 | SIP-01580 | Driver bateria 18 V | 10 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 212 | Bateria adicional 18V | 10 | 212 | SIP-01587 | Pack bateria 18 V | 10 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 213 | Cargador bateria 18V | 6 | 213 | SIP-01594 | Cargador pack 18 V | 6 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 214 | Escalera tijera aluminio 6 escalones | 12 | 214 | SIP-01601 | Escalera plegable aluminio 6 escalones | 12 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 215 | Escalera extensible aluminio 24 escalones | 6 | 215 | SIP-01608 | Escalera telescopica aluminio 24 escalones | 6 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 216 | Caja herramientas plastica 20 pulgadas | 40 | 216 | SIP-01615 | Maleta herramientas plastica 20 in | 40 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 217 | Carro portaherramientas 7 cajones | 6 | 217 | SIP-01622 | Gabinete herramientas 7 cajones | 6 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 218 | Linterna LED recargable | 60 | 218 | SIP-01629 | Linterna recargable LED recargable | 60 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 219 | Prolongador industrial 25m | 20 | 219 | SIP-01636 | Alargue industrial 25 m | 20 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 220 | Soldador electrico 40W | 20 | 220 | SIP-01643 | Soldador lapiz 40 W | 20 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
|  |  |  | 221 | SIP-88001 | Detector optico de humo 12 V | 35 | extra | sugerido para stock anual |
|  |  |  | 222 | SIP-88002 | Baliza industrial LED color ambar | 20 | extra | adicional sugerido |
|  |  |  | 223 | SIP-88003 | Conductor subterraneo tripolar 3x4 mm2 | 200 | extra | adicional no pedido |
|  |  |  | 224 | SIP-88004 | Bulbo LED alta potencia E40 60 W | 70 | extra | alternativa para nave alta |
|  |  |  | 225 | SIP-88005 | Kit bridas plasticas colores surtidos | 40 | extra | adicional no pedido |

## oferta_mantenimiento_integral.pdf

- Items solicitados cubiertos: 172
- Items solicitados faltantes: 48
- Items sobrantes en oferta: 5

| item pedido | descripcion solicitada | cantidad pedida | linea oferta | codigo proveedor | descripcion ofertada | cantidad ofertada | relacion | explicacion |
|---:|---|---:|---:|---|---|---:|---|---|
| 1 | Cable unipolar 1.5mm2 rojo | 1000 | 1 | MIS-00110 | Conductor flexible 1.5 mm2 rojo | 1000 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 2 | Cable unipolar 1.5mm2 azul | 1000 | 2 | MIS-00117 | Conductor flexible 1.5 mm2 azul | 1000 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 3 | Cable unipolar 1.5mm2 verde amarillo | 800 | 3 | MIS-00124 | Conductor flexible 1.5 mm2 verde amarillo | 800 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 4 | Cable unipolar 1.5mm2 negro | 800 | 4 | MIS-00131 | Conductor flexible 1.5 mm2 negro | 800 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 5 | Cable unipolar 2.5mm2 rojo | 1500 | 5 | MIS-00138 | Conductor flexible 2.5 mm2 rojo | 1500 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 6 | Cable unipolar 2.5mm2 azul | 1500 | 6 | MIS-00145 | Conductor flexible 2.5 mm2 azul | 1500 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 7 | Cable unipolar 2.5mm2 verde amarillo | 1200 | 7 | MIS-00152 | Conductor flexible 2.5 mm2 verde amarillo | 1200 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 8 | Cable unipolar 2.5mm2 negro | 1200 | 8 | MIS-00159 | Conductor flexible 2.5 mm2 negro | 1200 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 9 | Cable unipolar 4mm2 rojo | 800 | 9 | MIS-00166 | Conductor flexible 4 mm2 rojo | 800 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 10 | Cable unipolar 4mm2 azul | 800 | 10 | MIS-00173 | Conductor flexible 4 mm2 azul | 800 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 11 | Cable unipolar 4mm2 verde amarillo | 600 | 11 | MIS-00180 | Equivalente tecnico Conductor flexible 4 mm2 verde amarillo | 600 | semantic_match | equivalente tecnico |
| 12 | Canaleta PVC 20x10 blanca | 300 | 12 | MIS-00187 | Ducto polipropileno pasacable 20x10 blanca | 300 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 13 | Canaleta PVC 40x20 blanca | 200 | 13 | MIS-00194 | Ducto polipropileno pasacable 40x20 blanca | 150 | partial_quantity | stock parcial |
| 14 | Caja derivacion PVC 10x10 | 150 | 14 | MIS-00201 | Caja de paso plastica 10x10 | 150 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 15 | Caja estanca IP65 | 120 | 15 | MIS-00208 | Gabinete estanco IP65 | 120 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 16 | Llave termomagnetica bipolar 10A | 40 | 16 | MIS-00215 | Interruptor automatico 2 polos 10 A | 40 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 17 | Llave termomagnetica bipolar 16A | 60 | 17 | MIS-00222 | Interruptor automatico 2 polos 16 A linea alternativa | 60 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 18 | Llave termomagnetica bipolar 25A | 60 | 18 | MIS-00229 | Interruptor automatico 2 polos 25 A | 60 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 19 | Llave termomagnetica bipolar 32A | 40 | 19 | MIS-00236 | Interruptor automatico 2 polos 32 A | 48 | partial_quantity | bulto minimo de venta |
| 20 | Disyuntor diferencial bipolar 25A 30mA | 35 | 20 | MIS-00243 | Protector diferencial 2 polos 25 A 30 mA | 35 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 21 | Disyuntor diferencial bipolar 40A 30mA | 25 | 21 | MIS-00250 | Protector diferencial 2 polos 40 A 30 mA | 25 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 22 | Tomacorriente doble 10A blanco | 250 | 22 | MIS-00257 | Equivalente tecnico Modulo toma electrica doble 10 A blanco | 250 | semantic_match | equivalente tecnico |
| 23 | Tomacorriente industrial 16A | 80 | 23 | MIS-00264 | Modulo toma electrica industrial 16 A | 80 | needs_review | marca a confirmar |
| 24 | Ficha macho 10A | 150 | 24 | MIS-00271 | Plug macho 10 A | 150 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 25 | Ficha hembra 10A | 150 | 25 | MIS-00278 | Conector hembra 10 A | 150 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 26 | Prolongador electrico 10m | 30 | 26 | MIS-00285 | Alargue electrico 10 m | 22 | partial_quantity | stock parcial |
| 27 | Zapatilla electrica 6 tomas | 60 | 27 | MIS-00292 | Base multiple 6 tomas | 60 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 28 | Cinta aisladora negra | 300 | 28 | MIS-00299 | Rollo aislante negra | 300 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 29 | Cinta aisladora roja | 80 | 29 | MIS-00306 | Rollo aislante roja | 80 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 30 | Precinto plastico 200mm | 200 | 30 | MIS-00313 | Brida plastica 200 mm | 200 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 31 | Precinto plastico 300mm | 150 | 31 | MIS-00320 | Brida plastica 300 mm | 150 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 32 | Bornera 12 polos 10mm | 100 | 32 | MIS-00327 | Regleta de conexion 12 polos 10 mm | 100 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 33 | Terminal ojal aislado rojo | 1000 | 33 | MIS-00334 | Equivalente tecnico Terminal anillo aislado rojo | 1000 | semantic_match | equivalente tecnico |
| 34 | Terminal pala aislado azul | 1000 | 34 | MIS-00341 | Terminal faston pala aislado azul linea alternativa | 1000 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 35 | Multimetro digital basico | 12 | 35 | MIS-00348 | Tester digital basico | 12 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 36 | Tubo LED T8 18W luz fria | 500 | 36 | MIS-00355 | Lampara tubular LED T8 18 W luz fria | 500 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 37 | Panel LED 60x60 40W | 150 | 37 | MIS-00362 | Placa luminosa LED 60x60 40 W | 150 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 38 | Lampara LED E27 12W | 300 | 38 | MIS-00369 | Bulbo LED E27 12 W | 360 | partial_quantity | bulto minimo de venta |
| 39 | Lampara LED E27 18W | 200 | 39 | MIS-00376 | Bulbo LED E27 18 W | 150 | partial_quantity | stock parcial |
| 40 | Reflector LED exterior 100W IP65 | 80 | 40 | MIS-00383 | Proyector LED uso externo 100 W IP65 | 80 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 41 | Sensor movimiento pared | 70 | 41 | MIS-00390 | Detector de presencia pared | 70 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 42 | Fotocelula exterior | 50 | 42 | MIS-00397 | Celula fotoelectrica uso externo | 50 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 43 | Porta lampara E27 | 100 | 43 | MIS-00404 | Portalamp E27 | 100 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 44 | Driver panel LED 40W | 80 | 44 | MIS-00411 | Equivalente tecnico Fuente para placa LED 40 W | 80 | semantic_match | equivalente tecnico |
| 45 | Aplique emergencia LED | 120 | 45 | MIS-00418 | Luminaria autonoma emergencia LED | 120 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 46 | Cartel salida emergencia LED | 60 | 46 | MIS-00425 | Senal luminosa salida emergencia | 60 | needs_review | marca a confirmar |
| 47 | Cinta LED 12V 5m | 40 | 47 | MIS-00432 | Tira LED 12 V 5 m | 40 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 48 | Fuente switching 12V 5A | 30 | 48 | MIS-00439 | Fuente conmutada 12 V 5 A | 30 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 49 | Tubo corrugado liviano 3/4 | 500 | 49 | MIS-00446 | Canio flexible corrugado liviano 3/4 | 500 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 50 | Tubo corrugado pesado 1 pulgada | 300 | 50 | MIS-00453 | Canio flexible corrugado pesado 1 pulgada | 300 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 51 | Conector corrugado 3/4 | 200 | 51 | MIS-00460 | Acople para corrugado 3/4 linea alternativa | 200 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 52 | Conector corrugado 1 pulgada | 150 | 52 | MIS-00467 | Acople para corrugado 1 pulgada | 112 | partial_quantity | stock parcial |
| 53 | Cable taller 3x2.5mm2 | 300 | 53 | MIS-00474 | Cable multipolar uso taller 3x2.5 mm2 | 300 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 54 | Interruptor simple embutir | 180 | 54 | MIS-00481 | Tecla simple embutir | 180 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 55 | Interruptor doble embutir | 120 | 55 | MIS-00488 | Equivalente tecnico Tecla doble embutir | 120 | semantic_match | equivalente tecnico |
| 56 | Cano PVC agua 1/2 | 300 | 56 | MIS-00495 | Tuberia PVC presion 1/2 | 300 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 57 | Cano PVC agua 3/4 | 250 | 57 | MIS-00502 | Tuberia PVC presion 3/4 | 300 | partial_quantity | bulto minimo de venta |
| 58 | Cano PVC agua 1 pulgada | 150 | 58 | MIS-00509 | Tuberia PVC presion 1 pulgada | 150 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 59 | Codo PVC 1/2 | 300 | 59 | MIS-00516 | Curva PVC 1/2 | 300 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 60 | Codo PVC 3/4 | 250 | 60 | MIS-00523 | Curva PVC 3/4 | 250 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 61 | Tee PVC 1/2 | 200 | 61 | MIS-00530 | T PVC 1/2 | 200 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 62 | Tee PVC 3/4 | 150 | 62 | MIS-00537 | T PVC 3/4 | 150 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 63 | Union doble PVC 1/2 | 120 | 63 | MIS-00544 | Cupla union PVC 1/2 | 120 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 64 | Union doble PVC 3/4 | 100 | 64 | MIS-00551 | Cupla union PVC 3/4 | 100 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 65 | Valvula esferica 1/2 | 120 | 65 | MIS-00558 | Llave de paso esferica 1/2 | 90 | partial_quantity | stock parcial |
| 66 | Valvula esferica 3/4 | 100 | 66 | MIS-00565 | Equivalente tecnico Llave de paso esferica 3/4 | 100 | semantic_match | equivalente tecnico |
| 67 | Flexible sanitario 40cm | 180 | 67 | MIS-00572 | Conexion flexible sanitaria 40 cm | 180 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 68 | Flexible sanitario 60cm | 120 | 68 | MIS-00579 | Conexion flexible sanitaria 60 cm linea alternativa | 120 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 69 | Canilla lavatorio cierre ceramico | 60 | 69 | MIS-00586 | Griferia para lavatorio cierre ceramico | 60 | needs_review | marca a confirmar |
| 70 | Canilla servicio bronce 1/2 | 80 | 70 | MIS-00593 | Grifo de servicio bronce 1/2 | 80 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 71 | Sifon plastico lavatorio | 90 | 71 | MIS-00600 | Desague sifonado polipropileno lavatorio | 90 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 72 | Flotante deposito inodoro | 70 | 72 | MIS-00607 | Valvula flotante deposito inodoro | 70 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 73 | Kit reparacion mochila inodoro | 80 | 73 | MIS-00614 | Conjunto reparacion mochila inodoro | 80 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 74 | Sellador roscas anaerobico | 60 | 74 | MIS-00621 | Traba rosca selladora anaerobico | 60 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 75 | Cinta teflon | 300 | 75 | MIS-00628 | Rollo PTFE | 300 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 76 | Adhesivo PVC 125ml | 100 | 76 | MIS-00635 | Pegamento para PVC 125 ml | 120 | partial_quantity | bulto minimo de venta |
| 77 | Limpiador PVC 125ml | 80 | 77 | MIS-00642 | Equivalente tecnico Primer limpiador PVC 125 ml | 80 | semantic_match | equivalente tecnico |
| 78 | Rejilla piso acero inoxidable | 100 | 78 | MIS-00649 | Rejilla de desague acero inoxidable | 75 | partial_quantity | stock parcial |
| 79 | Tapa inspeccion PVC | 60 | 79 | MIS-00656 | Tapa registro PVC | 60 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 80 | Manguera reforzada 3/4 | 400 | 80 | MIS-00663 | Manguera tramada 3/4 | 400 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 81 | Tornillo autoperforante 8x1 | 5000 | 81 | MIS-00670 | Fijacion autoperforante 8x1 | 5000 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 82 | Tornillo autoperforante 8x1.5 | 5000 | 82 | MIS-00677 | Fijacion autoperforante 8x1.5 | 5000 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 83 | Tornillo madera 6x1 | 4000 | 83 | MIS-00684 | Fijacion para madera 6x1 | 4000 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 84 | Tornillo madera 8x2 | 4000 | 84 | MIS-00691 | Fijacion para madera 8x2 | 4000 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 85 | Tarugo nylon 6mm | 6000 | 85 | MIS-00698 | Anclaje nylon 6 mm linea alternativa | 6000 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 86 | Tarugo nylon 8mm | 6000 | 86 | MIS-00705 | Anclaje nylon 8 mm | 6000 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 87 | Tarugo nylon 10mm | 3000 | 87 | MIS-00712 | Anclaje nylon 10 mm | 3000 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 88 | Arandela plana 1/4 | 5000 | 88 | MIS-00719 | Equivalente tecnico Arandela lisa 1/4 | 5000 | semantic_match | equivalente tecnico |
| 89 | Tuerca hexagonal 1/4 | 5000 | 89 | MIS-00726 | Tuerca HEX 1/4 | 5000 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 90 | Varilla roscada 1/4 | 300 | 90 | MIS-00733 | Esparrago roscado 1/4 | 300 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 91 | Varilla roscada 3/8 | 200 | 91 | MIS-00740 | Esparrago roscado 3/8 | 150 | partial_quantity | stock parcial |
| 92 | Remache pop 4mm | 4000 | 92 | MIS-00747 | Remache aluminio pop 4 mm | 4000 | needs_review | marca a confirmar |
| 93 | Abrazadera metalica 1/2 | 1000 | 93 | MIS-00754 | Grapa metalica 1/2 | 1000 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 94 | Abrazadera metalica 3/4 | 1000 | 94 | MIS-00761 | Grapa metalica 3/4 | 1000 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 95 | Abrazadera omega 3/4 | 800 | 95 | MIS-00768 | Grapa omega 3/4 | 960 | partial_quantity | bulto minimo de venta |
| 96 | Broca HSS 4mm | 200 | 96 | MIS-00775 | Mecha HSS 4 mm | 200 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 97 | Broca HSS 6mm | 200 | 97 | MIS-00782 | Mecha HSS 6 mm | 200 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 98 | Broca HSS 8mm | 120 | 98 | MIS-00789 | Mecha HSS 8 mm | 120 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 99 | Broca pared 6mm | 150 | 99 | MIS-00796 | Equivalente tecnico Mecha widia 6 mm | 150 | semantic_match | equivalente tecnico |
| 100 | Broca pared 8mm | 150 | 100 | MIS-00803 | Mecha widia 8 mm | 150 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 101 | Disco corte metal 115mm | 400 | 101 | MIS-00810 | Disco de corte metal 115 mm | 400 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 102 | Disco desbaste metal 115mm | 200 | 102 | MIS-00817 | Disco para desbastar metal 115 mm linea alternativa | 200 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 103 | Disco corte inoxidable 115mm | 300 | 103 | MIS-00824 | Disco de corte inoxidable 115 mm | 300 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 104 | Hoja sierra manual 24T | 200 | 104 | MIS-00831 | Sierra manual hoja manual 24T | 150 | partial_quantity | stock parcial |
| 105 | Lija al agua grano 120 | 500 | 105 | MIS-00838 | Pliego lija agua grano 120 | 500 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 106 | Lija al agua grano 220 | 500 | 106 | MIS-00845 | Pliego lija agua grano 220 | 500 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 107 | Lija madera grano 80 | 300 | 107 | MIS-00852 | Pliego lija madera grano 80 | 300 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 108 | Bisagra comun 2 pulgadas | 300 | 108 | MIS-00859 | Bisagra standard 2 in | 300 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 109 | Bisagra comun 3 pulgadas | 250 | 109 | MIS-00866 | Bisagra standard 3 in | 250 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 110 | Candado 40mm | 100 | 110 | MIS-00873 | Equivalente tecnico Cierre candado 40 mm | 100 | semantic_match | equivalente tecnico |
| 111 | Candado 50mm | 80 | 111 | MIS-00880 | Cierre candado 50 mm | 80 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 112 | Cierre pasador zincado | 150 | 112 | MIS-00887 | Pasador zincado zincado | 150 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 113 | Rueda giratoria 50mm | 120 | 113 | MIS-00894 | Rueda pivotante 50 mm | 120 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 114 | Rueda fija 50mm | 120 | 114 | MIS-00901 | Rueda rigida 50 mm | 144 | partial_quantity | bulto minimo de venta |
| 115 | Escuadra metalica 100x100 | 200 | 115 | MIS-00908 | Angulo escuadra metalico 100x100 | 200 | needs_review | marca a confirmar |
| 116 | Pintura latex interior blanca 20L | 80 | 116 | MIS-00915 | Latex acrilico uso interno blanca 20 L | 80 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 117 | Pintura latex interior gris claro 20L | 30 | 117 | MIS-00922 | Latex acrilico uso interno gris claro 20 L | 22 | partial_quantity | stock parcial |
| 118 | Esmalte sintetico blanco 4L | 80 | 118 | MIS-00929 | Sintetico brillante blanco 4 L | 80 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 119 | Esmalte sintetico negro 4L | 50 | 119 | MIS-00936 | Sintetico brillante negro 4 L linea alternativa | 50 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 120 | Esmalte sintetico amarillo seguridad 4L | 40 | 120 | MIS-00943 | Sintetico brillante amarillo seguridad 4 L | 40 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 121 | Esmalte sintetico rojo seguridad 4L | 30 | 121 | MIS-00950 | Equivalente tecnico Sintetico brillante rojo seguridad 4 L | 30 | semantic_match | equivalente tecnico |
| 122 | Pintura demarcacion amarilla 10L | 40 | 122 | MIS-00957 | Revestimiento para demarcar amarilla 10 L | 40 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 123 | Antioxido convertidor gris 4L | 60 | 123 | MIS-00964 | Convertidor de oxido gris 4 L | 60 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 124 | Enduido interior 20kg | 50 | 124 | MIS-00971 | Masilla enduido 20 kg | 50 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 125 | Masilla plastica multiuso 1kg | 80 | 125 | MIS-00978 | Masilla poliester multiuso 1 kg | 80 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 126 | Sellador siliconado transparente 280ml | 200 | 126 | MIS-00985 | Silicona selladora cristal 280 ml | 200 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 127 | Sellador siliconado blanco 280ml | 200 | 127 | MIS-00992 | Silicona selladora blanco 280 ml | 200 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 128 | Adhesivo montaje 300ml | 120 | 128 | MIS-00999 | Pegamento montaje 300 ml | 120 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 129 | Pegamento contacto 1L | 70 | 129 | MIS-01006 | Adhesivo contacto 1 L | 70 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 130 | Aerosol lubricante multiuso 400ml | 200 | 130 | MIS-01013 | Lubricante aerosol multiuso 400 ml | 150 | partial_quantity | stock parcial |
| 131 | Desengrasante industrial 5L | 100 | 131 | MIS-01020 | Desengrase industrial 5 L | 100 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 132 | Alcohol isopropilico 1L | 120 | 132 | MIS-01027 | Equivalente tecnico IPA limpieza tecnica 1 L | 120 | semantic_match | equivalente tecnico |
| 133 | Removedor pintura gel 1L | 30 | 133 | MIS-01034 | Removedor gel pintura gel 1 L | 36 | partial_quantity | bulto minimo de venta |
| 134 | Pincel 2 pulgadas | 150 | 134 | MIS-01041 | Brocha 2 in | 150 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 135 | Pincel 3 pulgadas | 150 | 135 | MIS-01048 | Brocha 3 in | 150 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 136 | Rodillo lana 22cm | 120 | 136 | MIS-01055 | Rodillo pelo lana 22 cm linea alternativa | 120 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 137 | Bandeja pintura plastica | 60 | 137 | MIS-01062 | Cubeta pintura plastica | 60 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 138 | Cinta enmascarar 24mm | 500 | 138 | MIS-01069 | Cinta de pintor 24 mm | 500 | needs_review | marca a confirmar |
| 139 | Cinta enmascarar 48mm | 400 | 139 | MIS-01076 | Cinta de pintor 48 mm | 400 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 140 | Nylon cobertura 4x5m | 100 | 140 | MIS-01083 | Film protector 4x5 m | 100 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 141 | Detergente concentrado 5L | 120 | 141 | MIS-01090 | Limpiador detergente concentrado 5 L | 120 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 142 | Lavandina 5L | 200 | 142 | MIS-01097 | Hipoclorito 5 L | 200 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 143 | Limpiador desinfectante 5L | 160 | 143 | MIS-01104 | Equivalente tecnico Sanitizante limpiador 5 L | 120 | partial_quantity+semantic_match | stock parcial; equivalente tecnico |
| 144 | Limpiavidrios 5L | 80 | 144 | MIS-01111 | Limpia cristales 5 L | 80 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 145 | Desengrasante cocina 5L | 80 | 145 | MIS-01118 | Desengrase cocina 5 L | 80 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 146 | Jabon liquido manos 5L | 150 | 146 | MIS-01125 | Jabon para manos 5 L | 150 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 147 | Alcohol en gel 5L | 120 | 147 | MIS-01132 | Gel alcohol 5 L | 120 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 148 | Papel higienico industrial 300m | 600 | 148 | MIS-01139 | Higienico jumbo industrial 300 m | 600 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 149 | Toalla papel interfoliada | 300 | 149 | MIS-01146 | Papel toalla interfoliada | 300 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 150 | Bolsa residuos negra 60x90 | 1000 | 150 | MIS-01153 | Bolsa basura negra 60x90 | 1000 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 151 | Bolsa residuos consorcio 80x110 | 800 | 151 | MIS-01160 | Bolsa basura consorcio 80x110 | 800 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 152 | Trapo piso algodon | 500 | 152 | MIS-01167 | Pano piso algodon | 600 | partial_quantity | bulto minimo de venta |
| 153 | Repuesto mopa microfibra | 200 | 153 | MIS-01174 | Recambio mopa microfibra linea alternativa | 200 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 154 | Cabo aluminio 1.4m | 150 | 154 | MIS-01181 | Equivalente tecnico Mango aluminio 1.4 m | 150 | semantic_match | equivalente tecnico |
| 155 | Escoba interior | 180 | 155 | MIS-01188 | Escoba uso interno | 180 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 156 | Escoba exterior dura | 120 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 157 | Secador piso goma 50cm | 120 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 158 | Balde plastico 12L | 100 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 159 | Pulverizador manual 1L | 120 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 160 | Guante limpieza latex talle M | 300 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 161 | Guante limpieza latex talle L | 300 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 162 | Esponja abrasiva | 1000 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 163 | Fibra verde limpieza | 1000 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 164 | Cera piso alto transito 5L | 80 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 165 | Desodorante ambiente aerosol 360ml | 300 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 166 | Guante moteado talle M | 600 | 156 | MIS-01265 | Guante tejido con puntos talle M | 600 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 167 | Guante moteado talle L | 600 | 157 | MIS-01272 | Guante tejido con puntos talle L | 600 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 168 | Guante nitrilo descartable talle M | 200 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 169 | Guante nitrilo descartable talle L | 200 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 170 | Guante cuero descarne | 300 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 171 | Anteojo seguridad transparente | 400 | 158 | MIS-01300 | Gafa proteccion cristal | 480 | partial_quantity | bulto minimo de venta |
| 172 | Anteojo seguridad gris | 200 | 159 | MIS-01307 | Gafa proteccion gris | 200 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 173 | Protector auditivo tipo copa | 150 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 174 | Protector auditivo endoaural descartable | 300 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 175 | Casco seguridad blanco | 120 | 160 | MIS-01328 | Casco obra blanco | 120 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 176 | Casco seguridad amarillo | 80 | 161 | MIS-01335 | Equivalente tecnico Casco obra amarillo | 80 | semantic_match | equivalente tecnico |
| 177 | Barbijo descartable triple capa | 300 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 178 | Respirador media cara | 30 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 179 | Filtro respirador particulas P100 | 120 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 180 | Chaleco reflectivo talle M | 150 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 181 | Chaleco reflectivo talle L | 150 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 182 | Zapato seguridad talle 39 | 30 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 183 | Zapato seguridad talle 40 | 40 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 184 | Zapato seguridad talle 41 | 50 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 185 | Zapato seguridad talle 42 | 50 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 186 | Zapato seguridad talle 43 | 40 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 187 | Botiquin primeros auxilios | 20 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 188 | Recarga botiquin completa | 40 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 189 | Cinta peligro amarillo negro | 300 | 162 | MIS-01426 | Cinta advertencia amarillo negro | 300 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 190 | Cono vial reflectivo 70cm | 100 | 163 | MIS-01433 | Cono transito reflectivo 70 cm | 120 | partial_quantity | bulto minimo de venta |
| 191 | Destornillador plano 4mm | 80 | 164 | MIS-01440 | Desarmador plano 4 mm | 80 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 192 | Destornillador plano 6mm | 80 | 165 | MIS-01447 | Desarmador plano 6 mm | 80 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 193 | Destornillador Phillips PH1 | 80 | 166 | MIS-01454 | Desarmador Phillips PH1 | 80 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 194 | Destornillador Phillips PH2 | 80 | 167 | MIS-01461 | Desarmador Phillips PH2 | 80 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 195 | Alicate corte diagonal | 50 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 196 | Pinza universal | 50 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 197 | Pinza punta | 40 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 198 | Llave francesa 8 pulgadas | 40 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 199 | Llave francesa 12 pulgadas | 30 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 200 | Juego llaves combinadas 8 a 19mm | 25 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 201 | Juego llaves Allen metricas | 30 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 202 | Martillo carpintero 16oz | 40 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 203 | Maza goma 500g | 30 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 204 | Cutter reforzado | 100 | 168 | MIS-01531 | Cuchilla retractil reforzada linea alternativa | 100 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 205 | Repuesto hoja cutter 18mm | 300 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 206 | Cinta metrica 5m | 80 | 169 | MIS-01545 | Flexometro 5 m | 80 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 207 | Nivel aluminio 60cm | 25 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 208 | Pistola silicona manual | 30 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 209 | Taladro percutor 650W | 12 | 170 | MIS-01566 | Equivalente tecnico Taladro impacto 650 W | 14 | partial_quantity+semantic_match | bulto minimo de venta; equivalente tecnico |
| 210 | Amoladora angular 115mm | 12 | 171 | MIS-01573 | Esmeril angular 115 mm | 12 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 211 | Atornillador bateria 18V | 10 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 212 | Bateria adicional 18V | 10 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 213 | Cargador bateria 18V | 6 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 214 | Escalera tijera aluminio 6 escalones | 12 | 172 | MIS-01601 | Escalera plegable aluminio 6 escalones | 12 | match | misma necesidad, descripcion expresada con vocabulario del proveedor |
| 215 | Escalera extensible aluminio 24 escalones | 6 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 216 | Caja herramientas plastica 20 pulgadas | 40 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 217 | Carro portaherramientas 7 cajones | 6 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 218 | Linterna LED recargable | 60 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 219 | Prolongador industrial 25m | 20 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
| 220 | Soldador electrico 40W | 20 |  |  |  |  | missing_from_offer | no fue incluido en esta oferta parcial anual |
|  |  |  | 173 | MIS-99001 | Kit carteleria preventiva para planta | 15 | extra | adicional sugerido |
|  |  |  | 174 | MIS-99002 | Organizador metalico de herramientas | 12 | extra | adicional no pedido |
|  |  |  | 175 | MIS-99003 | Recambio mopa algodon uso industrial | 140 | extra | equivalente alternativo |
|  |  |  | 176 | MIS-99004 | Rollo cinta reflectiva rojo blanco | 90 | extra | adicional sugerido |
|  |  |  | 177 | MIS-99005 | Set puntas para driver de impacto | 30 | extra | adicional no pedido |
