# What can be improved

A prioritised list of gaps, risks and ideas found while building and testing
SchemeSaathi v1. Each item notes **why** it matters and a suggested **how**.
SRS requirement IDs are in brackets where relevant.

Priority: 🔴 do before real users · 🟠 important for v1.0 · 🟢 nice to have

---

## ✅ Progress (2026-11-03)

| Done | Item |
|---|---|
| ✅ | **Catalogue: 45 → 4,624 schemes** (central + all 36 states/UTs), imported from public myScheme data via a terminal-only pipeline (`data/download.sh`, see DATA_PIPELINE.md) |
| ✅ | **New questions** the engine couldn't ask: income-tax payer, construction-worker board, ex-serviceman, girl child, pregnancy/breastfeeding; new occupations (fisher, sportsperson, artist) |
| ✅ | **Conditional questions (`showIf`)**, so the longer questionnaire only asks what's relevant; empty steps are skipped |
| ✅ | **Scale:** per-state match index, slimmer result payload, paginated results ("show more") and a paginated, filterable admin list |
| ✅ | **Provenance:** every imported scheme stores source, source URL and the rule signals it was built from; citizens see "Auto-imported · not yet reviewed" |
| ✅ | **Review workflow (partial draft/publish):** a *Needs review* filter and flag; reviewed schemes are protected from re-imports |
| ✅ | **Frontend redesign:** "civic broadsheet" identity (DESIGN.md), with WCAG AA contrast verified |
| ✅ | Dependency audit: zod upgraded to v4 (high-severity advisory) |
| ⏳ | **Hindi for all 4,579 imported schemes** (names, ministries, summaries, detail text, document names). Pipeline and the Colab notebook `data/translations/translate_hindi_colab.ipynb` (IndicTrans2, free) are ready; 153/490 chunks done, not yet merged (DATA_PIPELINE.md §5) |

### New items uncovered this round

| | Item | Why | How |
|---|---|---|---|
| 🔴 | **Review imported rules** (4,579 schemes, `needs_review`) | Rules are heuristic; some will be too broad or too narrow | Work through Admin → Schemes → Needs review, state by state, starting with the states your users live in |
| 🔴 | **Native review of imported Hindi** | The Hindi for the 4,579 imports is machine-translated (NFR-11 needs it to be understandable) | A native speaker checks it during the per-scheme review, high-traffic schemes first. Fixes go into the admin panel or into `data/translations/hi.json` |
| 🟠 | **Official data source** | The datasets are third-party snapshots of myScheme (one repo has no licence) | Request a data feed or API access from NeGD / myScheme; re-run the pipeline from it |
| 🟠 | **Benefits and documents for the ~4,000 index-only schemes** | Only 538 imports have full detail text | Fetch detail pages from the official source once access is agreed |
| 🟢 | **Native bcrypt** | Pure-JS bcryptjs at cost 12 takes seconds on low-end CPUs | Use the `bcrypt` native module or argon2 |

---

## 1. Data quality (highest real-world risk)

| | Item | Why | How |
|---|---|---|---|
| 🔴 | **Verify all 45 seed schemes** against official portals | They were compiled from general knowledge for the demo. Amounts, income limits and deadlines (all illustrative) may be wrong, which leads to wrong eligibility (SRS risk "Wrong eligibility shown") | Go through each scheme with the admin panel's *Preview & test*, fix it, then click *Mark verified*. Get a volunteer/CSC operator to review 10 (SRS §3.5) |
| 🔴 | **Native-speaker review of Hindi** | The translations are machine-quality in places (SRS §2.6, NFR-11) | Have a native speaker review `client/src/i18n/hi.json` and all `*_hi` scheme text (including the ~12,000 machine-translated import strings) |
| 🟠 | **Grow to 100 schemes** (SRS §10.2) | Coverage is 45 | Prioritise the high-demand state schemes for the states your users come from |
| 🟠 | **Source citation per scheme** | `officialUrl` sometimes points to a portal home (e.g. myscheme.gov.in) rather than the scheme page | Add a `source_url` + `source_note` column; show "Source: … checked on …" |
| 🟢 | **Scheme change history** | No audit trail of who changed which rule when | Add a `scheme_revisions` table written on every admin save; show a diff in the editor |

## 2. Eligibility engine

| | Item | Why | How |
|---|---|---|---|
| 🟠 | **Questions the engine can't ask yet** | Some rules are impossible to encode today: land size (PM-KMY ≤ 2 ha), taxpayer status (APY, e-Shram), EPFO membership, "has a girl child under 10" (Sukanya), pregnancy (PMMVY). These schemes are either over-matched or missing | Add fields to `engine/fields.ts` (e.g. `incomeTaxPayer`, `landHolding`, `hasGirlChildUnder10`). Show some only when relevant (see conditional questions below) |
| 🟠 | **Conditional questions** | Everyone sees "education level" and "marital status" even when irrelevant. This is longer than needed (FR-01 target: under 2 min) | Add `showIf: { field, operator, value }` to `FieldDef`; filter steps on the client |
| 🟠 | **Rural vs urban income limits** | UP pension has different limits by area; today one rule approximates it | Already possible with OR groups (`area=rural AND income ≤ X` OR `area=urban AND income ≤ Y`). Update the seed data |
| 🟢 | **Exclusion rules** | Many schemes say "not if X" (e.g. government employee) | Add a "NOT group" type, or a per-rule `excludes` flag the UI shows as "You may be excluded if…" |
| 🟢 | **Tune ranking with real data** | The weights in `rank.ts` (0.6/0.15/0.15/0.1) are educated guesses | Log anonymous "scheme opened from results at position N" events and adjust weights |

## 3. Performance & scalability

| | Item | Why | How |
|---|---|---|---|
| 🟠 | **Re-measure NFR-01 on real hardware** | On the dev laptop (2012 i5, load generator on the same CPU), p95 was ~500 ms at 50 concurrent clients. That's borderline | Run `npm run perf` from a separate machine against the deployed API |
| 🟠 | **Smaller /api/match response** | Each response is ~30 kB, because it returns both languages plus a full summary per scheme | Return only slugs + reasons and let the client fetch a cached `/api/schemes?fields=summary`; or add `?lang=` and gzip (`compression` middleware) |
| 🟢 | **Use all CPU cores** | Node runs on one core | Run 2–4 instances behind nginx, or use the Node `cluster` module. The scheme cache is per-process, so admin writes must invalidate all instances (Postgres `LISTEN/NOTIFY`) |
| 🟢 | **Rate limiter store** | The in-memory limiter resets on restart and isn't shared across instances | Use a Redis or Postgres store for `express-rate-limit` |
| 🟢 | **PDF generation cost** | The Hindi PDF takes 1–4 s on slow CPUs, because fonts are parsed every time | Cache parsed font buffers; or convert the WOFF files to TTF once at build time |

## 4. Frontend & UX

| | Item | Why | How |
|---|---|---|---|
| 🟠 | **Real-user usability test** (NFR-09, SRS §10.2: 20 users, ≥ 80% unaided) | No user testing done yet | Run 5 sessions with the target users (farmer, senior, student, CSC operator). Watch where they hesitate |
| 🟠 | **Accessibility audit** (NFR-10) | Designed for WCAG AA but not measured | Run Lighthouse + axe (`@axe-core/playwright` in the e2e suite); test with VoiceOver/TalkBack |
| 🟠 | **Offline / slow networks** (NFR-02) | Target users are on 3G and low-end phones | Add a PWA service worker: cache the app shell, `/api/questions` and `/api/schemes/meta`. Measure LCP on simulated 3G |
| 🟠 | **Smaller main bundle** | About 98 kB gzipped JS for the citizen pages | Split react-dom into its own chunk; lazy-load the results and detail pages; check lucide icons are tree-shaken |
| 🟢 | **SEO for scheme pages** | A Vite SPA isn't indexed well, and scheme pages are a big organic-search opportunity | Prerender `/schemes/:slug` at build time (vite-plugin-ssr or a small script), or move public pages to Next.js |
| 🟢 | **Voice input** (FR-14, "Could") | Helps low-literacy users | Web Speech API `SpeechRecognition` (Chrome on Android supports `hi-IN`) on the age and state questions |
| 🟢 | **Volunteer mode** (UC-02) | CSC operators repeat the flow many times a day | A "Next person" button that clears answers without confirmation; optional print-only compact results |
| 🟢 | **Show the deadline on results** | Deadlines show as badges, but there is no "closing soon" sort or filter | Add sort options: relevance / deadline / benefit size |
| 🟢 | **Explain "not eligible"** | Users can't see *why* a scheme wasn't shown | Optional "Show schemes I don't qualify for" with the failed rule ("Age 62 > 40") |

## 5. Admin panel

| | Item | Why | How |
|---|---|---|---|
| 🟠 | **Multiple admins & roles** | One seeded admin; no way to add, remove or reset users from the UI | Admin-users page; roles `editor` (edit drafts) vs `publisher` (activate) |
| 🟠 | **Draft → publish workflow** (UC-03 "preview and publish") | Saving an active scheme changes live results immediately | Add a `status: draft/published` field; publish only after preview |
| 🟢 | **Bulk import/export** | Entering 100 schemes one by one is slow | CSV/JSON import with the same validator; export for backups and review |
| 🟢 | **Per-scheme test cases in the UI** | Admins re-test by hand | Store "expected result" personas per scheme and run them on save (mirrors `seedSchemes.test.ts`) |
| 🟢 | **Admin session improvements** | 8 h JWT with no server-side revocation | Short-lived sessions stored in the DB (revocable); optional TOTP 2FA |

## 6. Engineering & operations

| | Item | Why | How |
|---|---|---|---|
| 🟠 | **CI pipeline** (NFR-12) | Tests only run manually | GitHub Actions: typecheck → server unit/integration (Postgres service container) → client tests → Playwright. Add it when you create a private repo |
| 🟠 | **Linting & formatting** (NFR-12) | Only TypeScript strict mode, no ESLint/Prettier | Add `eslint` + `typescript-eslint` + `eslint-plugin-react-hooks` (would have caught the `useEffect` crash) and Prettier |
| 🟠 | **Coverage threshold** (NFR-12: ≥ 70% on the rules engine) | Coverage is measured, but not enforced | Set `coverage.thresholds` in `server/vitest.config.ts` |
| 🟠 | **Monitoring** (NFR-04) | No uptime or error tracking | Uptime ping on `/api/health`; error tracking (self-hosted GlitchTip/Sentry) with PII scrubbing |
| 🟠 | **Automated DB backups** (SRS §8.2: daily) | Only documented, not automated | A cron container running `pg_dump` with rotation, or use managed-Postgres backups |
| 🟢 | **Shared types between client and server** | API types are duplicated in `client/src/lib/types.ts` | An npm workspace `packages/shared`, or generate an OpenAPI spec from the zod schemas and generate client types |
| 🟢 | **Faster integration tests** | Each file re-seeds the DB and bcrypt runs at cost 12, so the suite takes ~90 s on slow machines | Use a lower bcrypt cost when `NODE_ENV=test`; wrap each test in a rolled-back transaction instead of reseeding |
| 🟢 | **Structured logging** | Custom minimal logger | `pino` with request IDs; keep the no-body/no-query rule |

## 7. Security & privacy (before going public)

| | Item | Why | How |
|---|---|---|---|
| 🔴 | **Change default credentials & secrets** | The defaults are in `.env.example` and `docker-compose.yml` | Set a strong `ADMIN_PASSWORD` and a random `JWT_SECRET`; remove the compose fallbacks in production |
| 🔴 | **HTTPS everywhere** (SRS §5.3) | The local Docker setup is plain HTTP with `COOKIE_SECURE=false` | Terminate TLS at the proxy; keep `COOKIE_SECURE=true` (the production default) |
| 🟠 | **Content-Security-Policy for the SPA** | nginx sets basic headers, but no CSP | Add a strict CSP (`default-src 'self'`). The inline theme script in `index.html` needs a hash or nonce |
| 🟠 | **Shared result links reveal answers** | The base64 in `?p=` is readable by anyone with the link | Make the trade-off visible at share time ("This link contains your answers"); optionally share only scheme IDs |
| 🟢 | **Dependency hygiene** | zod was already upgraded once for a high-severity advisory | Dependabot/Renovate plus `npm audit` in CI |
| 🟢 | **DPDP review** (NFR-08) | The privacy notice is written from principles, not legal review | Have the notice reviewed before public launch |

## 8. Product ideas (future scope, SRS §15)

- More regional languages: Tamil, Bengali, Marathi, Telugu. The `{ en, hi }` shape would become a `translations` table keyed by language.
- WhatsApp chatbot version that reuses `/api/questions` and `/api/match`.
- Opt-in deadline reminders. This needs consent and minimal contact storage, so it is a privacy design decision.
- Optional accounts to track applications (explicitly out of scope for v1.0, WH-02).
- Partnerships: a college scholarship cell or an NGO for real users and feedback (SRS §12 risk "Low adoption").

---

### Suggested order

1. Verify scheme data, Hindi review, change secrets (🔴)
2. Conditional questions + missing fields, accessibility audit, user testing
3. CI + lint + coverage threshold, backups, monitoring
4. Draft/publish workflow, multi-admin, bulk import
5. PWA/offline, SEO prerendering, more languages
