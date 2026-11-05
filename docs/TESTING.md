# Testing

| Level | Tool | Location | Run |
|---|---|---|---|
| Unit (engine, validator, ranking, explanations, seed data, importer) | Vitest | `server/tests/unit` | `cd server && npm run test:unit` |
| Integration (API + real Postgres) | Vitest + Supertest | `server/tests/integration` | `cd server && npm run test:integration` |
| UI unit/component | Vitest + Testing Library + jsdom | `client/src/**/*.test.ts(x)` | `cd client && npm test` |
| End-to-end (desktop + mobile viewport) | Playwright (system Chrome) | `e2e/tests` | `cd e2e && npx playwright test` |
| Performance | `scripts/perf-match.ts` | `server/scripts` | `cd server && npm run perf -- 1000 50` |

Integration tests use `schemesaathi_test` (created by `server/db-init`). Each file
wipes, migrates and seeds it in `beforeAll`. The helper refuses to reset any
database whose URL doesn't contain `_test`.

E2E tests start the API and Vite automatically (or reuse running ones). They are
non-destructive against the dev database. Screenshots go to `e2e/screenshots/`
(`npx playwright test visual`).

> **macOS 13 note:** current Playwright doesn't ship Chromium for macOS 13, so the
> config uses `channel: 'chrome'` (your installed Google Chrome).

## SRS traceability

| SRS test id | Requirement | Where |
|---|---|---|
| UT-RULES-* | FR-05 | `unit/operators.test.ts`, `unit/evaluate.test.ts` |
| FR-05 acceptance (≥ 30 schemes) | FR-05 | `unit/seedSchemes.test.ts`: all 45 schemes, 84 persona cases |
| UT-RANK-01 | FR-07 | `unit/rank.test.ts` |
| UT-VALID-01 | FR-18 | `unit/validate.test.ts` |
| IT-ADMIN-01 | FR-17 | `integration/admin.test.ts` (CRUD, status, verify) |
| IT-ADMIN-02 | FR-06 | `integration/admin.test.ts` (new scheme matches without redeploy) |
| IT-PDF-01 | FR-10 | `integration/public.test.ts` (dedup + EN/HI PDF) |
| IT-PRIV-01 | NFR-07 | `integration/public.test.ts` (no rows written by /match) |
| NFR-05 | Security | `integration/admin.test.ts` (bcrypt, cookie flags, 401s, 429 rate limit) |
| E2E-01 | FR-01, FR-02 | `e2e/tests/citizen.spec.ts` (desktop + mobile) |
| E2E-02 | FR-09 | `e2e/tests/citizen.spec.ts` |
| E2E-03 | FR-13 | `e2e/tests/citizen.spec.ts` (+ `client/src/i18n/i18n.test.ts` key parity, NFR-11) |
| FR-03/04 | skip/edit/persist | `e2e/tests/citizen.spec.ts` |
| FR-11 | search/filter | `integration/public.test.ts`, `e2e/tests/citizen.spec.ts` |
| UC-02 | volunteer checklist | `e2e/tests/citizen.spec.ts` |
| UC-03 | admin adds scheme | `integration/admin.test.ts`, `e2e/tests/admin.spec.ts` |
| PERF-01 | NFR-01 | `server/scripts/perf-match.ts` |
| Import pipeline | catalogue | `unit/importer.test.ts` (PDF parsing, rule extraction, mapping, regressions), `integration/import.test.ts` (insert/refresh/protect, matching, provenance) |
| Conditional questions | FR-01 | `client/.../validation.test.ts`, e2e questionnaire flow |

## Last recorded results (development machine: 2012 dual-core i5, macOS 13)

- Server: 226 tests passing (unit + integration, incl. import pipeline).
- Client: 22 tests passing.
- E2E: all passing (citizen + admin + full-catalogue + visual, desktop and mobile viewports).
- Performance with the **full 4,624-scheme catalogue** (compiled API, load generator on
  the same 2012 dual-core laptop): single request 15–25 ms; 10 concurrent clients
  p95 ≈ 415 ms (pass); 50 concurrent clients p95 ≈ 1 s (CPU-bound on this machine).
  Re-run on the deployment target; scale out with more instances if needed.
claude --resume add6d02d-ebff-4baf-9bc1-d7f33addee2b