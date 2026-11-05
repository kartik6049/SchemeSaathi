-- 001_init.sql — initial SchemeSaathi schema (SRS §8).
-- Rules are stored as data: rules sharing a group_id are AND-ed, groups are OR-ed.

CREATE TABLE schemes (
  id                SERIAL PRIMARY KEY,
  slug              TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_en           TEXT NOT NULL,
  name_hi           TEXT NOT NULL,
  ministry_en       TEXT NOT NULL,
  ministry_hi       TEXT NOT NULL,
  state             TEXT,                      -- NULL = central scheme (all India)
  category          TEXT NOT NULL,
  beneficiary_types TEXT[] NOT NULL DEFAULT '{}',
  summary_en        TEXT NOT NULL,
  summary_hi        TEXT NOT NULL,
  benefits_en       TEXT NOT NULL,
  benefits_hi       TEXT NOT NULL,
  eligibility_en    TEXT NOT NULL,
  eligibility_hi    TEXT NOT NULL,
  how_to_apply_en   TEXT NOT NULL,
  how_to_apply_hi   TEXT NOT NULL,
  official_url      TEXT NOT NULL,
  benefit_tier      SMALLINT NOT NULL DEFAULT 2 CHECK (benefit_tier BETWEEN 1 AND 3),
  deadline          DATE,
  last_verified_at  DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Full-text search document. 'simple' config works for both English and Hindi tokens.
  search            TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', name_en || ' ' || name_hi || ' ' || slug), 'A') ||
    setweight(to_tsvector('simple', summary_en || ' ' || summary_hi), 'B') ||
    setweight(to_tsvector('simple', benefits_en || ' ' || benefits_hi || ' ' || ministry_en), 'C')
  ) STORED
);
CREATE INDEX schemes_search_idx   ON schemes USING GIN (search);
CREATE INDEX schemes_active_idx   ON schemes (is_active);
CREATE INDEX schemes_category_idx ON schemes (category);

CREATE TABLE eligibility_rules (
  id         SERIAL PRIMARY KEY,
  scheme_id  INTEGER NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
  group_id   SMALLINT NOT NULL DEFAULT 1,
  field      TEXT NOT NULL,
  operator   TEXT NOT NULL CHECK (operator IN ('=', '!=', '<', '<=', '>', '>=', 'in', 'not_in')),
  value      JSONB NOT NULL,
  value_type TEXT NOT NULL CHECK (value_type IN ('string', 'number', 'boolean', 'string[]'))
);
CREATE INDEX eligibility_rules_scheme_idx ON eligibility_rules (scheme_id);

CREATE TABLE documents (
  id      SERIAL PRIMARY KEY,
  code    TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_hi TEXT NOT NULL
);

CREATE TABLE scheme_documents (
  scheme_id   INTEGER NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
  PRIMARY KEY (scheme_id, document_id)
);

CREATE TABLE admin_users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'admin',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Anonymous usage events: no IP, no user agent, no profile data (NFR-07).
CREATE TABLE analytics_events (
  id          BIGSERIAL PRIMARY KEY,
  event_type  TEXT NOT NULL,
  scheme_slug TEXT,
  step        SMALLINT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX analytics_events_type_idx ON analytics_events (event_type, created_at);
