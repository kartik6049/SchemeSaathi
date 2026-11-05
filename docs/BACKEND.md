# Backend guide (`server/`)

Express 5 + TypeScript (ESM). Each feature module follows **routes → service → repository**:
- routes: HTTP and validation
- service: logic
- repository: SQL

Express 5 forwards errors from async handlers automatically to `errorHandler`.

## Scripts

| Script | Does |
|---|---|
| `npm run dev` | Watch mode via tsx |
| `npm run build` / `start` | Compile to `dist/` / run compiled |
| `npm run db:migrate` / `db:seed` / `db:reset` | Database lifecycle |
| `npm test` (`test:unit`, `test:integration`, `test:coverage`) | Vitest |
| `npm run perf` | Load test `/api/match` (start the API with `API_RATE_LIMIT=1000000`) |
| `npm run typecheck` | `tsc --noEmit` |

## Files

| File | What it does |
|---|---|
| `src/server.ts` | Starts HTTP server; graceful shutdown (closes DB pool) |
| `src/app.ts` | `createApp()` builds middleware + routes (used by tests too) |
| `src/config/env.ts` | Loads `.env`, validates with zod, exports `env`. Fails fast on bad config |
| `src/db/pool.ts` | Shared `pg.Pool`, `query()`, `withTransaction()`; DATE columns returned as strings |
| `src/db/migrate.ts` | Migration runner (CLI + importable) |
| `src/db/seed/*` | Seeder, 45 schemes, 21 documents |
| `src/lib/errors.ts` | `AppError` + helpers (`notFound`, `badRequest`, …) |
| `src/lib/logger.ts` | Minimal logger; never logs bodies (privacy) |
| `src/lib/i18n.ts` | `Localized` type, `Lang` |
| `src/middleware/errorHandler.ts` | Maps errors (AppError, ZodError, bad JSON, unique violation) to JSON |
| `src/middleware/requireAdmin.ts` | Verifies JWT from httpOnly cookie, sets `req.admin` |
| `src/middleware/rateLimiters.ts` | API limiter (`API_RATE_LIMIT`/min) and login limiter (10/15 min) |
| `src/middleware/requestLogger.ts` | Method, path, status, duration |
| `src/engine/*` | Rules engine; see [RULES_ENGINE.md](RULES_ENGINE.md) |
| `src/modules/questions/` | `GET /api/questions` from the field registry |
| `src/modules/match/match.schema.ts` | zod profile schema generated from the registry |
| `src/modules/match/match.service.ts` | Evaluates + ranks all cached schemes |
| `src/modules/schemes/schemes.repository.ts` | All catalogue SQL: search, CRUD, admin list |
| `src/modules/schemes/schemes.service.ts` | 60s in-memory cache of active schemes + invalidation |
| `src/modules/schemes/taxonomy.ts` | Categories and beneficiary types (bilingual) |
| `src/modules/checklist/checklist.service.ts` | De-duplicates documents across schemes |
| `src/modules/checklist/pdf.ts` | pdfkit renderer; splits text into Devanagari/Latin font runs |
| `src/modules/analytics/*` | Anonymous event ingest + dashboard aggregation |
| `src/modules/admin/auth.*` | Login/logout/me; bcrypt; timing-safe unknown-user path |
| `src/modules/admin/admin.routes.ts` | Scheme CRUD, rule validation, preview, stats |
| `src/modules/admin/admin.schemas.ts` | zod schemas for admin writes |

## Environment variables

| Var | Default | Notes |
|---|---|---|
| `DATABASE_URL` | — | required |
| `TEST_DATABASE_URL` | — | used when `NODE_ENV=test` |
| `JWT_SECRET` | — | required, ≥ 32 chars |
| `PORT` | 4000 | |
| `CORS_ORIGIN` | `http://localhost:5173` | comma-separated |
| `COOKIE_SECURE` | true in production | set `false` only for plain-HTTP local Docker |
| `API_RATE_LIMIT` | 300 | requests/min/IP |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | — | used only by the seeder |

## Adding an endpoint

1. Create or extend `src/modules/<feature>/<feature>.routes.ts`. Validate input with zod (`schema.parse` throws → 400).
2. Put logic in a service and SQL in a repository.
3. Mount the router in `app.ts`.
4. Add an integration test in `tests/integration/`.
5. Document it in `docs/API.md`.

## PDF and Hindi

pdfkit's built-in fonts have no Devanagari. We bundle `@fontsource/noto-sans-devanagari`,
which ships Devanagari and Latin glyphs as **separate** subset files. `splitRuns()`
breaks each line into script runs. Punctuation always goes to the Latin font,
because the Devanagari subset lacks it. fontkit then performs Indic shaping
(conjuncts, matras).
