-- 002_imported_catalogue.sql — support thousands of imported myScheme schemes.

ALTER TABLE schemes
  ADD COLUMN source       TEXT NOT NULL DEFAULT 'curated' CHECK (source IN ('curated', 'myscheme', 'admin')),
  ADD COLUMN audience     TEXT NOT NULL DEFAULT 'individual' CHECK (audience IN ('individual', 'family', 'organisation')),
  -- false = shown in browse/search only (no personal eligibility rules could be derived)
  ADD COLUMN matchable    BOOLEAN NOT NULL DEFAULT TRUE,
  -- true = auto-imported; rules and text not yet checked by a human
  ADD COLUMN needs_review BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN source_url   TEXT,
  ADD COLUMN keywords     TEXT NOT NULL DEFAULT '',
  -- signals that produced the auto-extracted rules, for admin review
  ADD COLUMN import_notes TEXT[] NOT NULL DEFAULT '{}';

-- Rebuild the search document to include tags/keywords and eligibility text.
ALTER TABLE schemes DROP COLUMN search;
ALTER TABLE schemes ADD COLUMN search TSVECTOR GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', name_en || ' ' || name_hi || ' ' || slug), 'A') ||
  setweight(to_tsvector('simple', summary_en || ' ' || summary_hi || ' ' || keywords), 'B') ||
  setweight(to_tsvector('simple', benefits_en || ' ' || benefits_hi || ' ' || ministry_en || ' ' || left(eligibility_en, 2000)), 'C')
) STORED;
CREATE INDEX schemes_search_idx ON schemes USING GIN (search);

CREATE INDEX schemes_state_idx  ON schemes (state);
CREATE INDEX schemes_source_idx ON schemes (source);
CREATE INDEX schemes_review_idx ON schemes (needs_review) WHERE needs_review;
