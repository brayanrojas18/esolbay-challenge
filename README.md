# Challenge Esolbay — Conciliación de ofertas con AI

Procesa una oferta de proveedor en PDF o XLSX, la modela, la guarda en Postgres y la
concilia contra una solicitud de compra, sin que existan IDs en común entre las dos.

La salida está pensada para que decida una persona: cada relación viene con su motivo,
su confianza y los candidatos que se evaluaron.

---

## Correrlo

Necesitás **Node 20+**. Nada más: las credenciales de la base y de Gemini vienen en
`.env.demo` y son descartables, así que no hay que configurar nada.

```bash
npm install
npm run seed      # crea las tablas y carga los CSV (6 y 220 ítems)
npm run demo      # procesa las 4 ofertas y genera los reportes en out/
```

Los reportes quedan en `out/`. El `.html` se abre con doble clic.

Para correr los tests:

```bash
npm test          # 82 tests
```

---

## Resultado

Comparado contra `reconciliation_guide.md`, con `gemini-3.6-flash`:

| Oferta | Líneas | Relaciones | Ítem correcto | Ítem + estado |
|---|---:|---:|---:|---:|
| `oferta_oficenter_norte.xlsx` | 7 | 7 | 7/7 | 7/7 |
| `oferta_comercial_oficinas.pdf` | 6 | 6 | 6/6 | 6/6 |
| `oferta_suministros_industriales.xlsx` | 225 | 225 | 225/225 | 225/225 |
| `oferta_mantenimiento_integral.pdf` | 177 | 169 | 169/169 | 169/169 |
| | **415** | **407** | **407/407** | **407/407** |

Los 49 faltantes se detectaron todos, sin falsos positivos. Cuesta 49 llamadas al LLM
para las cuatro ofertas.

---

## Comandos

| | |
|---|---|
| `npm run seed` | crea las tablas y carga los CSV |
| `npm run demo` | corre todo el flujo sobre las 4 ofertas |
| `npm test` | los 82 tests |
| `npm run db:reset` | vacía la base (con `-- --hard` borra las tablas) |

Para procesar una oferta sola, paso a paso:

```bash
npm run process -- --file challenge/case-simple/offers/oferta_oficenter_norte.xlsx --requisition REQ-OFI-2026-001
npm run reconcile -- --offer <id que imprime el paso anterior>
npm run report -- --reconciliation <id que imprime el paso anterior>
```

Las ofertas de `case-simple` van con `REQ-OFI-2026-001` y las de `case-complex` con
`REQ-MOP-2026-001`.

Flags útiles: `--dry-run` (no llama a ninguna API), `--top-k N` (candidatos por línea,
5 por defecto), `--format md|json|html|all`.

---

## Cómo funciona

**Extracción.** El XLSX se parsea con código, sin LLM: es tabular y regular, y mandarlo a
un modelo sería pagar tokens para obtener un resultado peor. El PDF va por LLM en lotes de
40 líneas, porque su layout no está garantizado. En paralelo corre un parser determinístico
del PDF que sirve de segunda opinión: si los dos leen distinto un precio, queda como
warning en la trazabilidad.

Los precios en formato argentino (`2.839,20`) los convierte una función propia con tests,
nunca el modelo. Un LLM haciendo esa conversión es una fuente silenciosa de errores.

**Volumen.** Comparar 177 líneas contra 220 ítems a lo bruto son 38.940 comparaciones. En
su lugar, los embeddings viven en columnas `vector(1536)` con índice HNSW y el prefiltro
completo es **una sola query** con `CROSS JOIN LATERAL`: Postgres calcula el top-5 de cada
línea sin que ningún vector salga del servidor. El LLM después decide sobre 5 candidatos en
vez de 220.

Medido contra Supabase: 1 query en 1 segundo, contra 107 segundos que tardaba emitiendo una
query por línea.

**Conciliación.** Cascada de cinco niveles, de lo barato a lo caro:

1. Alias ya confirmado por un comprador — gratis
2. Prefiltro vectorial — una query indexada
3. Decisión del LLM sobre los 5 candidatos
4. Resolución de conflictos cuando dos líneas apuntan al mismo ítem
5. Barrido de lo pedido y no cotizado

Los estados son los de la guía (`match`, `partial_quantity`, `semantic_match`,
`missing_from_offer`, `extra`) más dos propios: `alternative` y `ambiguous`. Este último no
es un fallo: un sistema que admite que no sabe le sirve más a un comprador que uno que
inventa un match.

---

## Sin API key

Todo corre igual sin credenciales, con `--dry-run`. No es un modo a medias: el XLSX se
parsea igual, el PDF usa el parser determinístico y los embeddings los genera un baseline
léxico local de las mismas 1536 dimensiones.

Sirve para desarrollar sin gastar y para medir cuánto aporta el modelo:

| | Sin IA | Con Gemini |
|---|---:|---:|
| recall@5 del prefiltro | 98,8% | 100% |
| Ítem correcto | 91,7% | 100% |
| Ítem y estado | 87,6% | 100% |
| Faltantes falsos | 13 | 0 |

Las dos líneas que el baseline pierde son las que no comparten ninguna palabra con lo
pedido: `"Interruptor automatico 2 polos 10 A"` contra `"Llave termomagnetica bipolar 10A"`.

---

## Cambiar de proveedor de IA

Está resuelto por variable de entorno. Hoy funciona con OpenAI y con Google:

```bash
AI_PROVIDER=google
GOOGLE_GENERATIVE_AI_API_KEY=...
LLM_MODEL=gemini-3.6-flash
EMBEDDING_MODEL=gemini-embedding-001
EMBEDDING_DIMENSIONS=1536
```

Agregar otro es sumar un caso en `src/ai/client.ts`. La dimensión del embedding es
configurable y la migración la respeta, así que un modelo de 768 dimensiones no obliga a
tocar SQL.

Si querés usar tus propias credenciales, copiá `.env.example` a `.env`: ese archivo tiene
prioridad sobre `.env.demo`.

---

## Estructura

```
src/
  core/       config, errores, logging
  db/         schema, cliente, migraciones SQL
  ingest/     seed de los CSV, persistencia de ofertas
  extract/    parsers de PDF y XLSX, normalización
  ai/         cliente, embeddings, prompts
  reconcile/  candidatos, matcher, conflictos, estados
  report/     markdown, json, html
  cli/        los comandos
tests/        82 tests
scripts/      herramientas de medición
challenge/    archivos originales
out/          reportes generados
```

---

## Sobre `reconciliation_guide.md`

El enunciado pide que la aplicación no dependa de ese archivo. No lo hace: nada de `src/`
lo lee. Se usa solo en los tests, para validar el resultado contra la referencia.

Leyéndola en detalle apareció una inconsistencia en el material: la guía del `case-complex`
declara 172 ítems cubiertos pero su tabla documenta 164. Omite 8 líneas de la oferta
(`23, 46, 69, 92, 115, 138, 143, 170`), y 6 de esas 8 son justo las que llevan la nota
`marca a confirmar`. Las 8 son coincidencias legítimas: la 170, `"Taladro impacto 650 W"`,
es el ítem #209 `"Taladro percutor 650W"`.

Por eso el test compara contra las filas documentadas y reporta las 8 aparte.

---

## Mejoras pendientes

1. **Aprendizaje por confirmación.** La tabla `supplier_item_aliases` ya existe y está
   conectada al nivel 0 de la cascada. Falta la parte donde el comprador confirma un match:
   a partir de ahí ese proveedor matchea por código, gratis y sin LLM.
2. **Comparativo multi-proveedor.** Los dos escenarios traen ofertas competidoras. El paso
   natural es la matriz ítem × proveedor con el mejor precio resaltado, que es lo que el
   comprador necesita para adjudicar.
3. **Reclamo automático al proveedor** con los faltantes detectados.
4. **Conversión de unidades incompatibles** (rollo contra metro) con factores por ítem.
5. **Prompt caching** sobre el bloque de ítems, que se repite en cada llamada de matching.

---

Los detalles de cada decisión están en [docs/DECISIONS.md](docs/DECISIONS.md).
