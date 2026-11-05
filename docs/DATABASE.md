# Database

PostgreSQL 16 in Docker (`docker-compose.yml`, service `db`, host port **5433**,
bound to 127.0.0.1). Two databases are created on first start:

- `schemesaathi`: app data
- `schemesaathi_test`: wiped and re-seeded by integration tests
  (`server/db-init/01-create-test-db.sql`)

## Schema (`server/src/db/migrations/001_init.sql`)

| Table | Purpose |
|---|---|
| `schemes` | One row per scheme. All text has `_en` / `_hi` columns. `state` NULL = central. `search` is a generated `tsvector` (GIN-indexed). |
| `eligibility_rules` | `scheme_id, group_id, field, operator, value (jsonb), value_type`. Same group = AND, groups = OR. |
| `documents` | Catalogue of documents (`code`, `name_en`, `name_hi`). |
| `scheme_documents` | Many-to-many link between schemes and documents. |
| `admin_users` | `email`, bcrypt `password_hash` (cost 12), `role`. |
| `analytics_events` | Anonymous: `event_type`, optional `scheme_slug`, optional `step`, `created_at`. No IP, UA or answers. |
| `schema_migrations` | Applied migration filenames (managed by the runner). |

There is deliberately **no table for user profiles** (NFR-07).

### Migration 002 — imported catalogue
Adds to `schemes`: `source` (`curated` / `myscheme` / `admin`), `audience`
(`individual` / `family` / `organisation`), `matchable`, `needs_review`, `source_url`,
`keywords` (tags, included in search) and `import_notes` (rule signals). It also rebuilds
the `search` tsvector to cover keywords and eligibility text, and adds indexes on
state, source and pending review. Imported text gets its `*_hi` columns from the
translation dictionary (DATA_PIPELINE.md §5); any still-empty Hindi falls back to English in the UI.

## Migrations

`npm run db:migrate` applies every `migrations/NNN_*.sql` not yet listed in
`schema_migrations`, each one in a transaction. To change the schema, add a new
numbered file. Never edit an applied one.

`npm run db:reset` drops the schema, then migrates and seeds. It refuses to run when `NODE_ENV=production`.

## Seeding

`npm run db:seed` (idempotent):
1. Upserts documents (`seed/documents.data.ts`).
2. Inserts schemes from `seed/schemes.data.ts` that don't exist yet, matched by slug.
   Admin edits are **not** overwritten. Use `npm run db:seed -- --force` to reset seed schemes.
3. Validates every seed rule with the engine validator, and fails loudly on bad data.
4. Creates the admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD` if missing.

## Import

`npm run db:import` loads `data/processed/catalogue.json` (see DATA_PIPELINE.md).

## Search

`search` = weighted `to_tsvector('simple', ...)`: names and slug (A), summaries (B),
benefits and ministry (C). The `simple` config tokenises Hindi and English alike.
User input becomes a prefix query (`kisan pen` → `kisan:* & pen:*`). Tokens are
restricted to Unicode letters, digits and combining marks (needed for Devanagari
matras), so input can never inject tsquery syntax. Results are ranked with `ts_rank`.

## Backups (production)

The SRS requires daily backups. With the compose setup:
```bash
docker compose exec db pg_dump -U saathi schemesaathi | gzip > backup-$(date +%F).sql.gz
```
Schedule it with cron or your host's managed-Postgres backups.
