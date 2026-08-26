-- Esquema inicial.
--
-- Se escribe a mano en SQL legible en vez de generarlo con drizzle-kit: son
-- nueve tablas y el archivo es parte de la documentacion del modelo. Quien
-- revise el challenge lee esto y entiende el dominio sin abrir el ORM.

CREATE EXTENSION IF NOT EXISTS vector;

/* -------------------------------------------------------------------------- */
/* Catalogo y solicitudes                                                      */
/* -------------------------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS providers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  tax_id      text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT providers_name_key UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS requisitions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL,
  title       text NOT NULL,
  type        text,
  sector      text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT requisitions_code_key UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS requisition_groups (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id  uuid NOT NULL REFERENCES requisitions(id) ON DELETE CASCADE,
  name            text,
  delivery_method text CHECK (delivery_method IN ('pickup', 'delivery')),
  address_id      text
);

-- Catalogo maestro. Un item existe con independencia de la requisicion que lo
-- pida: es lo que permite que un alias de proveedor sobreviva a la compra.
CREATE TABLE IF NOT EXISTS items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text,
  name            text NOT NULL,
  description     text,
  unit_of_measure text,
  brand           text,
  material        text,
  certification   text,
  type            text,
  attributes      jsonb,
  embedding       vector({{EMBEDDING_DIM}}),
  CONSTRAINT items_code_key UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS requisition_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id  uuid NOT NULL REFERENCES requisitions(id) ON DELETE CASCADE,
  group_id        uuid REFERENCES requisition_groups(id) ON DELETE SET NULL,
  item_id         uuid NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  line_no         integer NOT NULL,
  quantity        numeric(14,3) NOT NULL,
  unit_of_measure text,
  raw_unit        text,
  raw_description text NOT NULL,
  embedding       vector({{EMBEDDING_DIM}}),
  CONSTRAINT requisition_items_line_key UNIQUE (requisition_id, line_no)
);

/* -------------------------------------------------------------------------- */
/* Ofertas                                                                     */
/* -------------------------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS offers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id     uuid NOT NULL REFERENCES providers(id) ON DELETE RESTRICT,
  requisition_id  uuid NOT NULL REFERENCES requisitions(id) ON DELETE CASCADE,
  quote_code      text,
  quote_date      text,
  terms           text,
  source_filename text NOT NULL,
  source_format   text NOT NULL CHECK (source_format IN ('pdf', 'xlsx')),
  source_hash     text NOT NULL,
  currency        text,
  status          text NOT NULL DEFAULT 'extracted',
  extraction_meta jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  -- Idempotencia: reprocesar el mismo archivo actualiza, no duplica.
  CONSTRAINT offers_source_key UNIQUE (requisition_id, source_hash)
);

CREATE TABLE IF NOT EXISTS offer_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id            uuid NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  line_no             integer NOT NULL,
  supplier_code       text,
  offered_description text NOT NULL,
  offered_quantity    numeric(14,3) NOT NULL,
  unit_of_measure     text,
  raw_unit            text,
  unit_price          numeric(14,4),
  raw_notes           text,
  flags               text[] NOT NULL DEFAULT ARRAY[]::text[],
  embedding           vector({{EMBEDDING_DIM}}),
  CONSTRAINT offer_items_line_key UNIQUE (offer_id, line_no)
);

/* -------------------------------------------------------------------------- */
/* Conciliacion                                                                */
/* -------------------------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS reconciliations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id         uuid NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  requisition_id   uuid NOT NULL REFERENCES requisitions(id) ON DELETE CASCADE,
  strategy_version text NOT NULL,
  model_used       text,
  summary          jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reconciliation_lines (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id    uuid NOT NULL REFERENCES reconciliations(id) ON DELETE CASCADE,
  -- null => la linea ofertada no corresponde a nada pedido (extra)
  requisition_item_id  uuid REFERENCES requisition_items(id) ON DELETE CASCADE,
  -- null => el item pedido no fue cotizado (missing_from_offer)
  offer_item_id        uuid REFERENCES offer_items(id) ON DELETE CASCADE,
  status               text NOT NULL CHECK (status IN (
                         'match', 'partial_quantity', 'semantic_match',
                         'alternative', 'missing_from_offer', 'extra', 'ambiguous'
                       )),
  confidence           numeric(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  quantity_delta       numeric(14,3),
  price_total          numeric(16,4),
  reasoning            text NOT NULL,
  candidates           jsonb,
  needs_review         boolean NOT NULL DEFAULT false,
  decided_by           text NOT NULL CHECK (decided_by IN (
                         'exact_code', 'alias', 'vector+llm', 'llm', 'lexical', 'unmatched'
                       )),
  -- Una linea de conciliacion sin ninguno de los dos lados no significa nada.
  CONSTRAINT reconciliation_lines_sides_check
    CHECK (requisition_item_id IS NOT NULL OR offer_item_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS supplier_item_aliases (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id                   uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  supplier_code                 text NOT NULL,
  item_id                       uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  confirmed_at                  timestamptz NOT NULL DEFAULT now(),
  source_reconciliation_line_id uuid REFERENCES reconciliation_lines(id) ON DELETE SET NULL,
  CONSTRAINT supplier_item_aliases_key UNIQUE (provider_id, supplier_code)
);

/* -------------------------------------------------------------------------- */
/* Indices                                                                     */
/* -------------------------------------------------------------------------- */

-- HNSW con distancia coseno: es el indice que convierte el prefiltro de
-- candidatos en una query indexada dentro de Postgres en vez de 50.600
-- comparaciones en memoria de Node. Ver docs/DECISIONS.md.
CREATE INDEX IF NOT EXISTS items_embedding_idx
  ON items USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS requisition_items_embedding_idx
  ON requisition_items USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS offer_items_embedding_idx
  ON offer_items USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS requisition_items_requisition_idx ON requisition_items (requisition_id);
CREATE INDEX IF NOT EXISTS requisition_groups_requisition_idx ON requisition_groups (requisition_id);
CREATE INDEX IF NOT EXISTS offers_requisition_idx ON offers (requisition_id);
CREATE INDEX IF NOT EXISTS offers_provider_idx ON offers (provider_id);
CREATE INDEX IF NOT EXISTS offer_items_offer_idx ON offer_items (offer_id);
CREATE INDEX IF NOT EXISTS reconciliations_offer_idx ON reconciliations (offer_id);
CREATE INDEX IF NOT EXISTS reconciliation_lines_reconciliation_idx
  ON reconciliation_lines (reconciliation_id);
CREATE INDEX IF NOT EXISTS reconciliation_lines_status_idx ON reconciliation_lines (status);
