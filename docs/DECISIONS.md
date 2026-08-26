# Decisiones tecnicas

Una seccion por tema. La ultima es la de limitaciones, y es la mas honesta.

---

## 1. Modelo de datos

### Por que el vocabulario de Esolbay y no el de los CSV

Los CSV del challenge hablan de `purchase_request` y `purchase_request_items`. El schema no
usa esos nombres: usa `requisition`, `requisition_group`, `item`, `provider`, `order`.

Es el vocabulario de la **API publica de Esolbay**. El enunciado dice que el ejercicio esta
inspirado en un flujo que ya resuelven dentro de su producto, asi que un modelo que habla el
idioma de su dominio se enchufa sin capa de traduccion. Tambien arrastra decisiones utiles:
`requisition_group` con `deliveryMethod` y `addressId` existe porque en su API una
requisicion agrupa items por forma de entrega, aunque los CSV de este challenge no lo usen.

### El catalogo maestro separado de la requisicion

Cada linea del CSV genera **dos** registros: uno en `items` (catalogo maestro) y otro en
`requisition_items` (lo que se pide en esta compra puntual).

Podria haber sido una sola tabla. La separacion existe porque es lo que hace posible el
aprendizaje por alias: `supplier_item_aliases` ata el codigo de un proveedor a un **item del
catalogo**, que sobrevive a la compra. Si el alias apuntara a la linea de una requisicion, se
perderia en cuanto esa compra se cierre.

### Las tres columnas `embedding`

`items`, `requisition_items` y `offer_items` tienen `vector(1536)` con indice HNSW y
`vector_cosine_ops`. La dimension esta fija en el schema: cambiar de modelo de embeddings
obliga a migrar la columna y regenerar todo, porque **vectores de dos modelos distintos no
son comparables entre si**.

### Idempotencia

- `offers` tiene unico `(requisition_id, source_hash)` con el SHA-256 del archivo.
  Reprocesar el mismo archivo actualiza la cabecera y reemplaza las lineas; no duplica.
- `requisition_items` tiene unico `(requisition_id, line_no)`, asi el seed se puede correr
  N veces.
- Las lineas de una oferta se reemplazan por completo en vez de diffearse. Con 225 filas el
  costo es irrelevante y la logica es mucho mas simple de auditar.

### Campos que existen solo para trazabilidad

`raw_description`, `raw_unit`, `raw_notes` guardan el texto original aunque ya exista la
version normalizada. Cuestan poco y son la unica forma de responder "¿por que el sistema
interpreto esto asi?" seis meses despues.

---

## 2. Procesamiento PDF vs XLSX

**No usan la misma estrategia porque no son el mismo problema.**

### XLSX: 100% deterministico, sin LLM

La planilla es tabular y regular. Mandar 225 filas a un modelo seria pagar tokens para
obtener un resultado peor: no entran comodas en una llamada, y una alucinacion sobre un
precio es un error que nadie detecta despues.

El parser busca la fila de headers (no asume que es la primera), resuelve las columnas por
sinonimos — aguanta una planilla en castellano o con otro orden — y lee todo con SheetJS.

Se evaluo usar el LLM para interpretar la cabecera comercial. No hizo falta: es
`"Etiqueta" | "valor"` en las columnas A y B. **IA donde aporta, codigo donde alcanza.**

### PDF: LLM por lotes, con un segundo parser como verificador

Un PDF no tiene estructura garantizada: el layout lo decide quien lo genero. El camino
principal es el LLM, que absorbe variaciones de diagramacion sin tocar codigo.

**Por que lotes de ~40 lineas y no una sola llamada:** 177 lineas en una generacion chocan
contra el limite de tokens de *salida*, y aun entrando, la calidad se degrada sobre el final
de una respuesta larga — el modelo empieza a saltear campos y a abreviar descripciones.
Lotes de 40 mantienen cada generacion en un tamanio confiable y permiten paralelizar con
`p-limit(3)`.

**Al LLM se le pide el precio como TEXTO, no como numero.** Devuelve `"2.839,20"` y lo
convierte `parseArgNumber`, que esta testeado. Un modelo convirtiendo formato es-AR es una
fuente silenciosa de errores de tres ordenes de magnitud.

**El parser deterministico del PDF no es un plan B improvisado.** Tiene dos usos concretos:

1. Es el camino de `--dry-run`.
2. Es el **oraculo de verificacion**: cuando corren los dos, `crossCheck()` compara linea por
   linea y toda discrepancia de precio, cantidad o codigo queda como warning en la
   trazabilidad. Es la forma barata de enterarse de que el modelo alucino un numero. No
   corrige nada automaticamente: reporta, y decide el humano.

Funciona porque `unpdf` devuelve una fila de tabla por linea y la **unidad** es vocabulario
cerrado. En `"... rojo 1000 metro 441,35"`, `metro` es lo unico que separa sin ambiguedad la
descripcion — que contiene numeros como `"1.5 mm2"` — de la cantidad y el precio.

### Dos trampas del PDF que costaron encontrar

1. **La cabecera de la tabla se repite en las 7 paginas.** Sin descartarla entra al lote del
   LLM como si fuera un producto. Se detecta exigiendo al menos 4 de las 6 etiquetas, para no
   descartar por accidente una linea que casualmente diga "cantidad".
2. **Los marcadores viven dentro de la descripcion.** 16 lineas empiezan con
   `"Equivalente tecnico "` y 10 terminan con `" linea alternativa"`. Hay que sacarlos
   **antes de generar el embedding**: si no, el vector queda contaminado por un texto que se
   repite en 26 lineas distintas y que no dice nada del producto. El marcador no se pierde,
   se convierte en flag.

---

## 3. Estrategia de AI

### `generateObject` + Zod, no texto libre

Toda salida del modelo pasa por un schema Zod antes de tocar el dominio. Si no valida, se
reintenta **una vez** con el error de validacion como feedback. Si vuelve a fallar, ese lote
se marca y la corrida sigue: **una linea mala no puede tumbar la extraccion de 177**.

### Por que el Vercel AI SDK

Abstrae el proveedor. Todo el codigo pide "el modelo de lenguaje" o "el de embeddings" a
`src/ai/client.ts` y no sabe que hay OpenAI del otro lado. Cambiar a Anthropic, Google,
Mistral o un modelo local por Ollama es cambiar ese archivo.

La salvedad honesta: **Anthropic no tiene API de embeddings**, asi que un cambio a Claude
igual necesitaria OpenAI o un modelo local para el prefiltro vectorial.

### El prompt de matching lleva contexto de dominio

No alcanza con pedirle al modelo que compare textos. El prompt le explica que esta en
procurement, que el proveedor usa el vocabulario de su propio catalogo, y le da **ejemplos
reales del dataset**:

```
"Cable unipolar 1.5mm2 rojo"      = "Conductor flexible 1.5 mm2 rojo"
"Precinto plastico 200mm"          = "Brida plastica 200 mm"
"Llave termomagnetica bipolar 16A" = "Interruptor automatico 2 polos 16 A"
```

Y le marca el limite en la otra direccion: **las medidas si tienen que coincidir**.
`"Cable 1.5 mm2 rojo"` y `"Cable 2.5 mm2 rojo"` son productos distintos aunque se parezcan.
La seccion, el color, el diametro y la potencia son parte de la identidad del producto.

Se le pide explicitamente que devuelva `null` si ninguno de los 5 candidatos corresponde:
*"es preferible un null honesto a un match inventado: del otro lado hay una persona que va a
comprar con esto"*.

### Embeddings: cache y lotes

Se batchean de a 100 por llamada y se cachean en disco por hash del texto. Reprocesar la
misma oferta no re-paga los embeddings — es la diferencia entre iterar gratis y pagar cada
vez que se corrige un bug del matcher.

### El baseline lexico local

`src/ai/local-embeddings.ts` proyecta el texto a las mismas 1536 dimensiones usando hashing
con signo de tokens y trigramas, normalizado L2. Todo el resto del pipeline — la columna
`vector`, el indice HNSW, la query de candidatos — funciona sin cambiar una linea.

El tokenizador separa letras de numeros: `"1.5mm2"` → `["1.5", "mm", "2"]`, que es lo que
permite que matchee con `"1.5 mm2"` escrito con espacios.

**Resulto mucho mejor de lo esperado** (98,8% de recall@5), y la razon es interesante: en
este dataset los productos se desambiguan por sus **especificaciones** (`20x10`, `IP65`,
`200 mm`, `10 A`) mas que por su sustantivo. Los trigramas capturan eso. La prediccion
inicial era que fallaria en `"Precinto plastico"` ↔ `"Brida plastica"`; no falla, porque
comparten `plastic*` y `200 mm`.

---

## 4. Conciliacion: la cascada de 5 niveles

De lo barato a lo caro. Cada nivel resuelve lo que puede y le pasa al siguiente solo lo que
quedo sin decidir.

| Nivel | Que hace | Costo |
|---|---|---|
| **0** | Alias confirmado por un comprador | gratis, confianza 1.0 |
| **1** | Prefiltro vectorial en Postgres | 1 query indexada |
| **2** | Decision del LLM sobre 5 candidatos | ~1 llamada cada 10 lineas |
| **3** | Resolucion de conflictos | gratis |
| **4** | Barrido de faltantes | gratis |

**Por que ese orden:** el nivel 0 es el que hace que el sistema se abarate con el uso. En una
segunda cotizacion del mismo proveedor se lleva la mayoria de las lineas y el LLM casi no se
usa. El nivel 1 antes del 2 es lo que hace viable el volumen. Los niveles 3 y 4 van al final
porque necesitan el panorama completo.

### Los estados

El enunciado dice textual: *"No imponemos estados especificos de conciliacion"*. Se eligio el
vocabulario de la **guia de los escenarios** — `match`, `partial_quantity`, `semantic_match`,
`missing_from_offer`, `extra` — porque es el que ya usa el material del challenge, y asi el
test de regresion compara uno a uno sin tabla de traduccion.

Se agregaron dos:

- **`alternative`**: el proveedor cotiza dos lineas para el mismo item pedido. La guia las
  etiqueta `extra`, pero para el comprador no es lo mismo un producto que no pidio que una
  segunda opcion para algo que si pidio.
- **`ambiguous`**: el sistema no pudo decidir. **No es un fallo, es un estado de primera
  clase.** Un sistema que admite que no sabe le sirve mas a un comprador que uno que inventa
  un match. Umbral: confianza < 0.6, y siempre con `needs_review = true`.

### Precedencia de estados

Verificada contra las 34 filas con cantidad distinta de las dos guias: **la cantidad distinta
siempre gana**. Ninguna esta etiquetada de otra forma.

1. Cantidad distinta → `partial_quantity`
2. Equivalente tecnico → `semantic_match`
3. Resto → `match`

### El signo del delta importa

No es lo mismo que el proveedor tenga **menos** stock del pedido (problema de
abastecimiento) que que redondee **hacia arriba** por presentacion comercial (neutro o hasta
conveniente). El resumen los cuenta por separado como `shortfallLines` y `overageLines`, y el
reporte tiene una seccion dedicada solo a los faltantes de stock.

### Conflictos: por que el perdedor NO pasa a `extra`

Esta fue la correccion de diseño mas importante del proyecto, y salio de mirar los datos.

La primera version degradaba a `extra` toda linea que perdiera un conflicto. Al medir contra
la guia aparecio esto: las lineas 16 a 19 del PDF son
`"Interruptor automatico 2 polos"` de 10, 16, 25 y 32 A. Las cuatro reclamaron el mismo item.
Tres quedaron marcadas `extra`, o sea que **el reporte le decia al comprador que no habia
pedido ninguna de las tres. Y las habia pedido.**

`extra` afirma "el proveedor cotizo algo que no pediste": es una afirmacion con confianza.
Perder un conflicto es exactamente lo contrario. El estado correcto es `ambiguous`.

La regla quedo asi:

- Gana la de mayor confianza. Desempate estable por numero de linea, para que dos corridas
  sobre los mismos datos den lo mismo.
- La perdedora conserva el vinculo al item como **hipotesis**, y pasa a:
  - `alternative` si trae el flag de linea alternativa **y** la diferencia de confianza con
    la ganadora es ≤ 0.15 — o sea, era una competidora creible. Es el caso de la mopa de
    algodon contra la de microfibra.
  - `ambiguous` en cualquier otro caso.
- Las dos quedan con `needs_review`. **Nunca un match duplicado silencioso.**

El efecto medido: los extras falsos del `case-complex` bajaron de 21 a 4 (la guia espera 5) y
el item correcto subio de 88,8% a 91,7%.

### Por que un item ambiguo no aparece ademas como faltante

Si una linea ambigua no reclamara el item, el mismo item apareceria tambien como
`missing_from_offer`, y el comprador leeria *"no cotizado"* justo al lado de una linea que
propone cotizarlo. Entonces el item **si** queda reclamado, pero la cobertura del resumen lo
excluye: queda en su propio grupo, ni cubierto ni faltante. La particion es exacta —
`cubiertos + ambiguos + faltantes = total de items` — y el test de regresion la verifica.

### El umbral que NO se pudo poner

Para separar un `extra` real de un match correcto se busco un corte por score. Medido sobre
el `case-complex`:

```
top-1 correcto    n=151   min 0.353   mediana 0.748
top-1 incorrecto  n=13    min 0.301   mediana 0.505
extras reales     n=5     0.271, 0.386, 0.411, 0.475, 0.485
```

**Las distribuciones se solapan.** No existe un umbral que los separe. Insistir con uno seria
fingir precision.

Lo que si funciona es una señal que ya esta en los datos: el proveedor **anota** esas lineas
como `"adicional no pedido"` o `"adicional sugerido"`, y eso llega como flag
`extra_suggested`. Se usa como evidencia, no como veredicto: solo decide cuando la similitud
vectorial no la contradice con fuerza (score < 0.6).

Limitacion documentada: una oferta real que no anote sus extras no se beneficia de esto y los
va a dejar en `ambiguous`. Es donde el LLM, que puede responder "ninguno de los 5
corresponde", gana de verdad.

---

## 5. Volumen

### El calculo

| | `case-complex` PDF | `case-complex` XLSX |
|---|---|---|
| Items solicitados | 220 | 220 |
| Lineas ofertadas | 177 | 225 |
| **Comparaciones por fuerza bruta** | **38.940** | **49.500** |
| Queries con prefiltro | **1** | **1** |
| Candidatos que ve el decisor por linea | 5 | 5 |

### Como

El prefiltro completo es **un solo `CROSS JOIN LATERAL`**:

```sql
SELECT oi.line_no, c.*
FROM offer_items oi
CROSS JOIN LATERAL (
  SELECT ri.id, ri.line_no, ri.raw_description,
         1 - (ri.embedding <=> oi.embedding) AS score
  FROM requisition_items ri
  WHERE ri.requisition_id = $1 AND ri.embedding IS NOT NULL
  ORDER BY ri.embedding <=> oi.embedding
  LIMIT 5
) c
WHERE oi.offer_id = $2
```

Cada iteracion del lateral usa el indice HNSW, porque `oi.embedding` es constante dentro de
la subconsulta. **Ningun vector de 1536 dimensiones sale del servidor.**

### Costos medidos (contra Supabase, region San Pablo)

| Operacion | Version ingenua | Version actual |
|---|---:|---:|
| Prefiltro de 177 lineas | 177 queries, **107 s** | 1 query, **1,1 s** |
| Embeddings de 220 items | 220 `UPDATE`, **126 s** | 9 statements, **9,8 s** |
| Extraccion del PDF (dry-run) | — | 235 ms |
| Conciliacion completa | — | 2,7 s |

**La misma leccion aparecio dos veces: el cuello de botella no era Postgres, eran los
round-trips.** Las dos optimizaciones salieron de medir, no de leer el codigo.

### Costo en tokens, medido

Procesar y conciliar **las cuatro ofertas** (415 lineas en total) con `gemini-3.6-flash`:

| | Llamadas | Tokens entrada | Tokens salida |
|---|---:|---:|---:|
| Extraccion (solo los 2 PDF) | 6 | 7.984 | 31.887 |
| Matching (las 4 ofertas) | 43 | 123.710 | 79.207 |
| **Total** | **49** | **131.694** | **111.094** |

Son centavos. Y el cache de embeddings hace que la segunda corrida sea casi gratis: en la
corrida medida, 172 de los 177 embeddings del PDF grande salieron del cache porque las
descripciones no habian cambiado.

El dato interesante para el criterio de volumen: **43 llamadas de matching para 415 lineas**,
gracias a que el prefiltro deja 5 candidatos por linea y se batchean de a 10. Sin prefiltro
habria que mandar los 220 items solicitados en cada llamada.

---

## 6. Calidad y manejo de errores

- **TypeScript `strict`** con `noUncheckedIndexedAccess`. Sin `any` en los bordes del dominio.
- **Errores tipados**: `ExtractionError`, `MatchingError`, `ConfigError`, cada uno con
  contexto estructurado (archivo, linea) para degradar esa linea sola y seguir.
- **Warnings en vez de silencio.** El sistema reporta lo que no entiende en lugar de
  tragarselo. Se gano el sueldo enseguida: encontro la nota `"cantidad menor a la
  solicitada"` en el PDF chico, una variante de vocabulario que no estaba mapeada.
- **Logging estructurado por etapa** con conteos y tiempos.
- **`--dry-run`** en todos los comandos.

### El bug de jsonb que vale contar

Guardar `${JSON.stringify(x)}::jsonb` con postgres.js produce un jsonb de tipo `string`: el
JSON queda escapado adentro de un string y al leerlo vuelve texto en vez de objeto. Pasa
porque en `Bind` el driver busca el serializer por OID, y `json` esta registrado bajo 114, no
bajo 3802 (`jsonb`), asi que el string se vuelve a serializar.

Se verifico contra la base con las seis variantes posibles. La forma que se uso es
`${JSON.stringify(x)}::text::jsonb`: el parametro viaja como texto plano y es Postgres quien
parsea. Es la unica que no depende del tipado del driver. Las inserciones masivas de
`reconciliation_lines` usan `unnest` con cast explicito por columna por la misma razon.

### Sobre las dependencias

- **`xlsx` se instala desde el CDN oficial de SheetJS**, no desde npm. La version de npm esta
  congelada en 0.18.5 con dos CVEs sin fix (prototype pollution y ReDoS) porque SheetJS dejo
  de publicar ahi.
- Quedan 4 vulnerabilidades moderadas, todas de `esbuild` dentro del loader de `drizzle-kit`.
  El advisory es sobre el dev-server de esbuild, que drizzle-kit nunca levanta.

### Migraciones a mano, y runner propio

Las migraciones son SQL legible escrito a mano en vez de generado por `drizzle-kit`: son
nueve tablas y el archivo es parte de la documentacion del modelo. Quien evalue el schema lee
`0000_init.sql` y entiende el dominio sin abrir el ORM.

El runner tambien es propio, porque `drizzle-kit migrate` toma un **advisory lock de sesion**
y el transaction pooler de Supabase no mantiene estado entre statements. El runner usa una
tabla de control, que funciona igual en los dos modos de pooling.

---

## 7. Limitaciones conocidas

Lo que el enunciado dice que valora: *"No esperamos extraccion perfecta. Nos interesa ver
como diseñas el modelo y el flujo"*. Entonces, sin maquillaje:

### 1. El 100% es contra la guia de ESTE dataset, no una promesa general

Las 407 relaciones documentadas se reprodujeron exactas con `gemini-3.6-flash`. Es un
resultado real y medido, pero conviene leerlo con la escala puesta: son cuatro ofertas de un
dataset preparado, con vocabulario consistente y sin ruido de escaneo. No es una tasa de
acierto proyectable a ofertas reales.

Lo que si sostiene el numero es que el **recall@5 del prefiltro fue 100%**: ningun item
correcto quedo fuera de los candidatos. Ese es el techo, y el LLM lo alcanzo entero.

### 2. La deteccion de extras del modo sin LLM depende de que el proveedor los anote

Explicado en la seccion 4. Con LLM no aplica — el modelo responde "ninguno de los 5
corresponde" y los 5 extras salen bien. Es la limitacion mas concreta del `--dry-run`.

### 3. El `case-simple` se degrada en modo lexico

Con 6 items el prefiltro tiene poquisimo contexto y las similitudes lexicas quedan bajas:
tres de las siete lineas del XLSX caen a `ambiguous` aunque el item identificado sea el
correcto. Con Gemini da 7/7. Es el comportamiento esperado y honesto del baseline: cuando no
esta seguro, lo dice.

### 4. El parser deterministico del PDF esta afinado a este layout

Funciona perfecto sobre los dos PDFs del challenge (177/177 y 6/6 lineas), pero su expresion
regular asume el orden de columnas y el vocabulario de unidades observados. Un PDF con otra
diagramacion lo rompe — por eso el camino principal es el LLM y este es el verificador.

### 5. No hay conversion de unidades incompatibles

Si un proveedor cotiza en `rollo` lo que se pidio en `metro`, el sistema lo matchea pero no
puede comparar cantidades. Haria falta un factor de conversion por item del catalogo.

### 6. Una sola oferta por corrida

El comparativo multi-proveedor — que es lo que el comprador realmente necesita para
adjudicar — no esta. Es la mejora #2 del README y la mas valiosa de las pendientes.

### 7. Sin UI

El enunciado aclara que no es obligatoria. El entregable es CLI + reportes en Markdown, JSON
y HTML.

---

## Que haria con mas tiempo

En este orden:

1. **Medir con el LLM** y publicar la comparacion contra el baseline. Es el numero que falta.
2. **El comparativo multi-proveedor**, porque es lo que cierra el ciclo del comprador.
3. **Un set de evaluacion propio** con los casos dificiles etiquetados a mano, para poder
   iterar sobre los prompts sin depender de la guia del challenge — que ademas, como se
   documento, tiene sus propias inconsistencias.
