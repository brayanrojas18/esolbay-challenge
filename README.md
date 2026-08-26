# Challenge Tecnico Esolbay — Procesamiento y conciliacion de ofertas con AI

Procesa una oferta de proveedor en **PDF o XLSX**, la modela, la persiste en Postgres y la
concilia contra una solicitud de compra ya cargada, **sin que existan IDs compartidos entre
las dos**. La salida permite revisar la oferta sin abrir el archivo original.

El output esta pensado para que **una persona decida**, no para que el sistema decida solo:
cada relacion propuesta viene con su motivo, su confianza y los candidatos que se evaluaron.

---

## Que hace, en concreto

Sobre el escenario grande del challenge — 220 items solicitados contra una oferta de 177
lineas en PDF y otra de 225 en XLSX:

| | |
|---|---|
| Extrae las 177 lineas del PDF de 7 paginas | sin huecos de numeracion, descartando la cabecera repetida en cada pagina |
| Convierte los precios es-AR | `2.839,20` → `2839.20`, con parser dedicado y testeado |
| Genera embeddings y prefiltra en Postgres | **1 query indexada** en lugar de 38.940 comparaciones |
| Concilia en cascada de 5 niveles | alias → vectorial → decision → conflictos → faltantes |
| Emite reportes | Markdown, JSON y HTML autocontenido |

## Resultado

Medido contra `reconciliation_guide.md`, con `gemini-3.6-flash` y `gemini-embedding-001`:

| Oferta | Lineas | Relaciones documentadas | Item correcto | Item + estado |
|---|---:|---:|---:|---:|
| `oferta_oficenter_norte.xlsx` | 7 | 7 | **7/7** | **7/7** |
| `oferta_comercial_oficinas.pdf` | 6 | 6 | **6/6** | **6/6** |
| `oferta_suministros_industriales.xlsx` | 225 | 225 | **225/225** | **225/225** |
| `oferta_mantenimiento_integral.pdf` | 177 | 169 | **169/169** | **169/169** |
| **Total** | **415** | **407** | **407/407 (100%)** | **407/407 (100%)** |

Los 49 faltantes esperados por las guias se detectaron todos, **sin un solo falso positivo**.

Costo de procesar las cuatro ofertas completas: **49 llamadas al LLM**, 131.694 tokens de
entrada y 111.094 de salida. Con `gemini-3.6-flash` eso son centavos.

> Las 8 lineas de diferencia entre "lineas" y "relaciones documentadas" del PDF grande son
> una inconsistencia de la guia del challenge, no del sistema. Ver
> [Sobre reconciliation_guide.md](#sobre-reconciliation_guidemd).

---

## Requisitos

- **Node 20+** (probado en 22.16)
- **PostgreSQL con la extension `pgvector`**. Lo mas rapido es un proyecto gratis de
  [Supabase](https://supabase.com); tambien sirve Neon o un Postgres local con pgvector.
- **`OPENAI_API_KEY`** — *opcional*. Sin ella todo corre igual en modo `--dry-run`
  (ver [Modo sin API key](#modo-sin-api-key)).

---

## Setup

```bash
npm install
cp .env.example .env    # y completar DATABASE_URL
```

### Sobre la connection string de Supabase

En el boton **Connect → Direct Connection** hay tres strings. Cual usar:

| Opcion | Puerto | Sirve |
|---|---|---|
| **Session pooler** | 5432 | La mejor. Soporta prepared statements. |
| **Transaction pooler** | 6543 | Funciona. Exige `prepare: false`, que ya esta puesto en `src/db/client.ts`. |
| Direct connection | 5432 | Solo IPv6 en el plan free: no resuelve desde la mayoria de las redes. |

> Si el puerto 5432 no responde (acepta el TCP pero se cuelga en el handshake), esta
> bloqueado por tu red o tu ISP — es comun en conexiones hogarenias. Usa el transaction
> pooler.

No hace falta habilitar `pgvector` a mano: lo hace la migracion.

### Cargar la base

```bash
npm run seed
```

Corre las migraciones y carga los dos escenarios: 6 items en `REQ-OFI-2026-001` y 220 en
`REQ-MOP-2026-001`. Es **idempotente**: correrlo dos veces no duplica nada.

---

## Uso

### Todo de una vez

```bash
npx tsx scripts/run-all.mts
```

Procesa las cuatro ofertas de los dos escenarios y deja los 12 reportes en `out/`.

### Paso a paso

```bash
# 1. Extraer una oferta y persistirla con sus embeddings
npm run process -- --file challenge/case-complex/offers/oferta_mantenimiento_integral.pdf \
                   --requisition REQ-MOP-2026-001

# 2. Conciliarla contra la solicitud (imprime el id de la conciliacion)
npm run reconcile -- --offer <offerId>

# 3. Generar los reportes
npm run report -- --reconciliation <reconciliationId> --format all
```

| Flag | Que hace |
|---|---|
| `--dry-run` | No llama a ninguna API. Se activa solo si no hay `OPENAI_API_KEY`. |
| `--top-k N` | Candidatos que trae el prefiltro vectorial por linea (default 5). |
| `--format md\|json\|html\|all` | Formato del reporte (default `all`). |
| `--out <dir>` | Donde escribir los reportes (default `out/`). |

### Tests

```bash
npm test        # 82 tests
npm run typecheck
```

Los tests de parsers y normalizacion corren sin base de datos. El **test de regresion contra
la guia** necesita `DATABASE_URL`; si no esta, se saltea en vez de fallar.

---

## Ejemplo de salida

```
## Resumen ejecutivo

| Proveedor   | Mantenimiento Integral Sur SRL |
| Cotizacion  | COT-MIS-2026-407               |
| Fecha       | 2026-05-23                     |

**Cobertura: 152 de 220 items pedidos (69.1%).**

| Estado              | Lineas | Que significa                                   |
|---------------------|-------:|-------------------------------------------------|
| Coincidencia        |    120 | mismo producto y misma cantidad                 |
| Cantidad parcial    |     20 | mismo producto, cantidad distinta a la pedida   |
| Equivalente tecnico |     12 | el proveedor lo ofrece como equivalente tecnico |
| Dudoso              |     21 | el sistema no pudo determinarlo con confianza   |
| No cotizado         |     61 | pedido pero no cotizado                         |
| Sobrante            |      4 | cotizado pero no pedido                         |

| Total cotizado por el proveedor            | $ 175.445.419,40 |
| **Total comparable** (solo lo que se pidio)| **$ 172.019.419,40** |
```

El HTML tiene el mismo contenido con color por estado y las filas que requieren atencion
arriba. Es un archivo unico sin dependencias: se abre con doble clic.

---

## Modo sin API key

Todo el pipeline corre sin `OPENAI_API_KEY`. No es un modo degradado a medias: es un camino
completo con dos implementaciones locales y deterministicas.

| Etapa | Con key | Sin key (`--dry-run`) |
|---|---|---|
| Extraccion XLSX | deterministica | **igual** (nunca uso LLM) |
| Extraccion PDF | LLM por lotes + verificacion cruzada | parser deterministico por maquina de estados |
| Embeddings | `text-embedding-3-small` | baseline lexico local (hashing de tokens y trigramas, 1536 dim) |
| Decision del match | LLM sobre 5 candidatos | mejor candidato por similitud, con umbral |

Sirve para desarrollar sin gastar, para correr los tests en CI, y como **linea de base
medible**. Y como el pipeline es el mismo, la diferencia entre las dos columnas es
exactamente cuanto aporta el modelo:

### Cuanto aporta la IA, medido

Sobre el PDF de 177 lineas del `case-complex`, mismo codigo, misma base:

| Metrica | Baseline lexico | Con Gemini | |
|---|---:|---:|---|
| recall@5 del prefiltro | 98,8% | **100%** | techo de calidad del matcher |
| recall@1 del prefiltro | 92,1% | **98,8%** | |
| Item correcto tras la decision | 91,7% | **100%** | |
| Item **y estado** correctos | 87,6% | **100%** | |
| Faltantes detectados | 48/48 | **48/48** | |
| Faltantes falsos | 13 | **0** | |

Las 2 lineas que el prefiltro lexico perdia son las de solapamiento de vocabulario cero, y
son justamente las que los embeddings semanticos recuperan:

- `"Interruptor automatico 2 polos 10 A"` ↔ `"Llave termomagnetica bipolar 10A"`
- `"Gafa proteccion cristal"` ↔ `"Antiparra proteccion incolora"`

Los 13 faltantes falsos del baseline eran lineas que el matcher lexico no podia distinguir
entre si — las cuatro variantes de amperaje del interruptor automatico, por ejemplo — y que
la cascada marcaba `ambiguous` para revision humana. El LLM las resuelve sin ayuda.

### Cambiar de proveedor

El proveedor se elige por variable de entorno. Estan implementados OpenAI y Google:

```bash
AI_PROVIDER=google          # o "openai"
GOOGLE_GENERATIVE_AI_API_KEY=...
LLM_MODEL=gemini-3.6-flash
EMBEDDING_MODEL=gemini-embedding-001
EMBEDDING_DIMENSIONS=1536
```

Agregar Anthropic, Mistral o un modelo local por Ollama es sumar un caso al switch de
[`src/ai/client.ts`](src/ai/client.ts). La dimension del embedding es configurable y la
migracion la respeta, asi que cambiar a un modelo de 768 dimensiones no requiere tocar SQL.

---

## Como se resuelve el volumen

Es el punto que el enunciado evalua explicitamente, asi que va con numeros medidos.

Conciliar 177 lineas ofertadas contra 220 items solicitados **por fuerza bruta** son
**38.940 comparaciones**, y ademas hay que traer los 220 items a memoria de Node para
calcular coseno a mano. Con la oferta XLSX de 225 lineas son 49.500.

En su lugar:

1. Los embeddings viven en columnas `vector(1536)` con **indice HNSW** y distancia coseno.
2. El prefiltro completo es **una sola query** con `CROSS JOIN LATERAL`, que calcula el top-5
   de cada linea ofertada **dentro de Postgres**. Ningun vector viaja por la red.
3. El decisor razona sobre **5 candidatos por linea, no 220**: el costo del LLM baja en la
   misma proporcion.

Medido contra Supabase (region San Pablo):

| | |
|---|---|
| Prefiltro de las 177 lineas | **1 query, ~1,1 s** |
| La version ingenua (1 query por linea) | 177 queries, **107 s** |

La misma leccion aparecio dos veces: el cuello de botella no era Postgres sino los
round-trips. Los embeddings de la requisicion pasaron de **126 s a 9,8 s** al agrupar 220
`UPDATE` individuales en lotes de 25 con `unnest`.

---

## Estructura

```
src/
  core/       config, errores tipados, logging por etapa
  db/         schema Drizzle, cliente, migraciones SQL, runner
  ingest/     seed de los CSV, persistencia de ofertas
  extract/    pdf.ts, pdf-text.ts, pdf-deterministic.ts, xlsx.ts, normalize.ts, schemas.ts
  ai/         client, embeddings, local-embeddings, extract-prompt, match-prompt
  reconcile/  candidates (pgvector), matcher (cascada), conflicts, status, persist
  report/     data, markdown, json, html, format
  cli/        seed, process, reconcile, report
tests/
  fixtures/   lector de reconciliation_guide.md (SOLO tests)
  *.test.ts   82 tests
scripts/      herramientas de medicion y validacion
challenge/    archivos originales, read-only
out/          reportes generados
docs/         DECISIONS.md
```

---

## Sobre `reconciliation_guide.md`

El enunciado dice que la aplicacion **no debe depender de ese archivo como input
automatico**. No lo hace: el codigo de `src/` nunca lo lee. Se usa unicamente en
`tests/fixtures/reconciliation-guide.ts` y en los scripts de medicion, para validar el
resultado contra la referencia.

Al leerla en detalle aparecio una **inconsistencia en el material del challenge**: la guia
del `case-complex` declara "172 items cubiertos" pero su tabla solo documenta **164**
relaciones. Omite 8 lineas de la oferta (`23, 46, 69, 92, 115, 138, 143, 170`), y 6 de esas 8
son exactamente las que llevan la nota `marca a confirmar`. Las 8 son coincidencias
legitimas verificables a mano: la 170, `"Taladro impacto 650 W"`, corresponde al item #209
`"Taladro percutor 650W"`.

Por eso el test de regresion compara contra las filas **documentadas** y reporta las 8
aparte. Esta cubierto por un test que lo deja explicito.

---

## Mejoras futuras

Ninguna esta implementada salvo la tabla de aliases, que ya existe en el schema y esta
conectada al nivel 0 de la cascada.

1. **Aprendizaje por confirmacion.** Cada match que un comprador confirma se guarda en
   `supplier_item_aliases`. La proxima vez que ese proveedor cotice, el match es por codigo:
   instantaneo, gratis y 100% confiable. El sistema se abarata y mejora con el uso. Encaja
   con el catalogo maestro de items que Esolbay ya tiene en su API.
2. **Comparativo multi-proveedor.** Los dos escenarios traen dos ofertas competidoras. El
   paso natural es la matriz item × proveedor con el mejor precio resaltado, que es lo que el
   comprador necesita para adjudicar.
3. **Reclamo automatico al proveedor.** Detectados los faltantes y los datos incompletos,
   generar el mail de vuelta.
4. **Normalizacion de unidades incompatibles** (rollo vs metro, caja vs unidad) con factores
   de conversion por item del catalogo.
5. **Prompt caching** sobre el bloque de items de la requisicion, que se repite en cada
   llamada de matching.
6. **Re-ranking con cross-encoder** si el volumen crece y el prefiltro pierde precision.

---

## Documentacion tecnica

[**docs/DECISIONS.md**](docs/DECISIONS.md) — el porque de cada decision: modelo de datos,
PDF vs XLSX, estrategia de AI, la cascada de conciliacion, el manejo de volumen con costos
medidos, y las limitaciones conocidas.
