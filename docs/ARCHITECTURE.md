# Architecture

## Overview

```
 Browser (React SPA)                    Node API (Express)                       PostgreSQL
┌──────────────────────┐  JSON/HTTPS  ┌──────────────────────────────┐        ┌───────────────────┐
│ Questionnaire        │─────────────▶│ /api/questions  field registry│        │ schemes           │
│ Results / Checklist  │              │ /api/match ──▶ rules engine ◀─┼─cache──│ eligibility_rules │
│ Browse / Detail      │              │ /api/schemes   catalogue + FTS│◀──────▶│ documents         │
│ Admin panel (lazy)   │              │ /api/checklist  PDF (pdfkit)  │        │ scheme_documents  │
└──────────────────────┘              │ /api/events     analytics     │        │ admin_users       │
      ▲ answers kept in               │ /api/admin/*    JWT cookie    │        │ analytics_events  │
      │ localStorage only             └──────────────────────────────┘        └───────────────────┘
```

In development, Vite (`:5173`) proxies `/api` to the API (`:4000`), so the browser
sees one origin. In Docker, nginx serves the built SPA and proxies `/api`.

## Key ideas

1. **Rules as data (FR-06).** Each scheme's eligibility is rows in
   `eligibility_rules` (`field`, `operator`, `value`, `group_id`). Admins edit them
   in the UI; no deploy is needed.
2. **One field registry.** `server/src/engine/fields.ts` defines every profile
   question once. It feeds the questionnaire API, profile validation, rule
   validation and match explanations.
3. **Stateless matching (NFR-07).** The profile is sent with each `/api/match`
   request, evaluated in memory, and never stored. Results URLs carry the
   profile (`/results?p=…`), which makes them shareable.
4. **Pure engine.** `server/src/engine/` has no I/O, so it is fast and easy to
   unit-test. Services load data and call it.
5. **Cache + per-state index for speed (NFR-01).** Matchable schemes and their rules
   are cached in memory (60s, invalidated on admin writes) and indexed by state, so a
   request evaluates only central schemes plus the user's state (~1,000 of ~4,600).
6. **Two kinds of scheme.** Curated schemes (hand-written, bilingual) and imported
   myScheme schemes (auto-extracted rules, machine-translated Hindi, `needs_review`). Imports
   that yield no specific personal rule are browse/search-only. See DATA_PIPELINE.md.

## Request flow: "Check my eligibility"

1. The client loads `GET /api/questions` → 7 steps, ≤ 2 questions each.
2. Answers are saved to `localStorage` as the user goes (`ProfileContext`).
3. On finish, the client navigates to `/results?p=<base64url(profile)>`.
4. `ResultsPage` → `POST /api/match` with the profile.
5. `match.routes` validates it with a zod schema generated from the field registry.
6. `match.service` gets cached schemes → `evaluateScheme()` for each → `relevanceScore()` → `rank()`.
7. The response holds `eligible[]` and `possiblyEligible[]` with bilingual reasons.
8. The user selects schemes → `POST /api/checklist` (JSON) or `/api/checklist/pdf`.

## Folder map

| Path | Responsibility |
|---|---|
| `server/src/config/` | Validated environment config |
| `server/src/db/` | Pool, migration runner, SQL migrations, seed data |
| `server/src/engine/` | Rules engine (pure functions) |
| `server/src/importer/` | myScheme parsing, rule extraction, record mapping (pure) |
| `server/scripts/data/` | Data pipeline: PDF extraction, catalogue build |
| `data/` | `download.sh`; raw and processed datasets (git-ignored) |
| `server/src/modules/<feature>/` | Routes → service → repository per feature |
| `server/src/middleware/` | Errors, auth guard, rate limiting, logging |
| `client/src/lib/` | API client, types, helpers (no React) |
| `client/src/i18n/` | Translations and the `useLocalized` hook |
| `client/src/context/` | Profile, theme and admin-auth state |
| `client/src/components/` | Reusable UI (`ui/`) and page chrome (`layout/`) |
| `client/src/features/` | Feature folders: questionnaire, results, schemes, admin |
| `client/src/pages/` | Simple standalone pages (home, privacy, 404) |

## Environments

| | Dev | Docker "full" |
|---|---|---|
| UI | Vite :5173 | nginx :8080 |
| API | tsx watch :4000 | node dist :4000 |
| DB | postgres container :5433 | same container |

All published ports bind to `127.0.0.1`, so nothing is reachable from your network.
