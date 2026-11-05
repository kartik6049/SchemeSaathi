# SchemeSaathi — Government Scheme Finder

A bilingual (Hindi / English) web app that helps citizens find government welfare
schemes they are **likely** eligible for, explains *why*, and produces a combined
document checklist — without login and without storing personal data.

**Catalogue:** 4,624 schemes (45 hand-curated + 4,579 imported from public myScheme
data) covering central schemes and all 36 states/UTs. See [docs/DATA_PIPELINE.md](docs/DATA_PIPELINE.md).

Built from the SRS in [`markdown/01-scheme-finder-srs.md`](markdown/01-scheme-finder-srs.md).

| Layer | Tech |
|---|---|
| Frontend | React 19 + Vite + TypeScript + Tailwind CSS v4, i18next |
| Backend | Node.js 22 + Express 5 + TypeScript, zod validation |
| Database | PostgreSQL 16 (Docker) with full-text search |
| PDF | pdfkit + bundled Noto Sans Devanagari (Hindi checklist) |
| Tests | Vitest + Supertest (API), Vitest + Testing Library (UI), Playwright (E2E) |

---

## Quick start (local development)

Prerequisites: Node 22+, Docker Desktop.

```bash
# 1. Start Postgres (host port 5433, bound to 127.0.0.1 only)
docker compose up -d db

# 2. API
cd server
cp .env.example .env            # then set a random JWT_SECRET (see comment in file)
npm install
npm run db:migrate
npm run db:seed                 # 45 curated schemes, documents, admin user from .env
npm run dev                     # http://localhost:4000

# Optional: the full ~4,600-scheme catalogue (downloads ~20 MB of public data)
../data/download.sh
npm run data:extract && npm run data:build && npm run db:import   # Hindi comes from data/translations/hi.json

# 3. Web UI (new terminal)
cd client
npm install
npm run dev                     # http://localhost:5173  (proxies /api to :4000)
```

Admin panel: <http://localhost:5173/admin> — credentials are `ADMIN_EMAIL` /
`ADMIN_PASSWORD` from `server/.env` (default `admin@schemesaathi.local` /
`ChangeMe!2026` — **change them**).

### Run everything in Docker

```bash
docker compose --profile full up -d --build
# UI  -> http://localhost:8080
# API -> http://localhost:4000/api/health
```

The API container migrates and seeds itself on start (idempotent).

To put it online on a server with HTTPS, follow [HOST_GUIDE.md](HOST_GUIDE.md).

---

## Tests

```bash
cd server && npm test            # unit + integration (needs the db container)
cd server && npm run test:coverage
cd client && npm test            # component + unit tests
cd e2e && npm install && npx playwright test   # starts API + UI automatically
cd server && npm run perf        # match API latency (API must be running)
```

See [docs/TESTING.md](docs/TESTING.md) for what each suite covers and how it maps to the SRS.

---

## Repository layout

```
.
├── docker-compose.yml        Postgres (+ optional API/web containers)
├── markdown/                 Project SRS (source requirements)
├── data/                     download.sh + raw/processed scheme datasets (git-ignored)
├── docs/                     Developer guides (start with ARCHITECTURE.md)
├── server/                   Express API, rules engine, migrations, seed data
├── client/                   React UI
└── e2e/                      Playwright end-to-end tests
```

## Documentation

| Guide | What's inside |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System overview, request flow, folder-by-folder map |
| [DATA_PIPELINE.md](docs/DATA_PIPELINE.md) | Downloading and importing the ~4,600-scheme catalogue, rule extraction |
| [DESIGN.md](docs/DESIGN.md) | Design system: identity, tokens, typography, compositions, accessibility |
| [RULES_ENGINE.md](docs/RULES_ENGINE.md) | How eligibility is decided, ranked and explained |
| [API.md](docs/API.md) | Every endpoint with request / response examples |
| [DATABASE.md](docs/DATABASE.md) | Schema, migrations, seeding, search |
| [BACKEND.md](docs/BACKEND.md) | Server modules file-by-file |
| [FRONTEND.md](docs/FRONTEND.md) | Client structure file-by-file, i18n, theming |
| [ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) | How to add / edit schemes and rules (non-developers) |
| [TESTING.md](docs/TESTING.md) | Test strategy, SRS traceability |
| [SECURITY_PRIVACY.md](docs/SECURITY_PRIVACY.md) | Threat model, privacy guarantees |
| [DECISIONS.md](docs/DECISIONS.md) | Architecture decision records (incl. deviations from SRS) |
| [IMPROVEMENTS.md](docs/IMPROVEMENTS.md) | Prioritised list of what to improve next |

## Important note on data

The 45 curated schemes were compiled by hand from general public information;
the ~4,600 imported schemes come from public myScheme data (via the datasets in
`data/download.sh`) and their eligibility rules are **auto-extracted** — they are
labelled "not yet reviewed" until an admin checks them. Amounts, limits and
deadlines change; verify against the official portal (linked on every scheme)
before real-world use. Source of scheme information: [myScheme](https://www.myscheme.gov.in), Government of India.
