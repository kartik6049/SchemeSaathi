# Architecture decision records

### ADR-1: Rules as data
Eligibility rules live in `eligibility_rules`, not in code, because schemes change
often and admins must update them without a deploy (FR-06).

### ADR-2: No accounts in v1.0
There is no citizen login. This reduces privacy risk and friction (FR-02, NFR-07).

### ADR-3: Stateless matching, profile in the URL
The profile is posted per request and never stored. The results URL carries it as
base64url, which gives shareable results (FR-12) without server state. The trade-off
is that links reveal answers, which is disclosed on the privacy page.

### ADR-4: React + Vite instead of Next.js *(deviation from SRS §9.2)*
The user asked for React. A Vite SPA with code-split admin routes keeps the
citizen bundle small (~133 kB gzip JS). SEO for scheme pages would need
prerendering later. That is listed as future work.

### ADR-5: Express + TypeScript, raw SQL via `pg`
Express was chosen for its small surface area and the user's request for Node.
SQL lives only in repositories, with no ORM, because the queries are simple and FTS is Postgres-specific.

### ADR-6: Single field registry
`engine/fields.ts` drives questions, validation, rule validation and explanations,
so a field is added in one place.

### ADR-7: Income as bands with interval logic
Income is asked as a range for privacy (SRS §15 open issue). Comparisons use the
band's bounds. When a band straddles a limit, the result is "possibly eligible"
rather than a false yes or no.

### ADR-8: Postgres full-text search with the `simple` config
It handles Hindi and English tokens with no extra service. Meilisearch remains an option if fuzzy search is needed.

### ADR-9: Server-side PDF with bundled Devanagari font
A server PDF was chosen per the SRS. Font subsets require per-script runs (see BACKEND.md).
The checklist dialog also supports browser **Print** as a fallback.

### ADR-10: httpOnly cookie sessions for admin
These are safer than tokens stored in localStorage. The same-origin setup (Vite proxy / nginx) keeps `SameSite=Strict` workable.

### ADR-11: Postgres on port 5433, localhost-only
The development machine already runs Postgres.app on 5432. All container ports
bind to 127.0.0.1 so nothing is exposed to the network.

### ADR-12: Playwright drives system Chrome
Bundled Chromium is unsupported on macOS 13 (the dev machine), so `channel: 'chrome'` is used.

### ADR-13: In-memory scheme cache + memoised explanations
Matching evaluates all schemes on every request. The active schemes are cached for 60s
and invalidated on admin writes. Rule grouping and explanation strings are memoised per
rule object. Together these roughly doubled throughput on the dev machine.

### ADR-14: Import the myScheme catalogue with auto-extracted rules
Hand-writing rules for ~4,600 schemes isn't feasible. We import public myScheme
data and extract rules heuristically (tags + eligibility text). The extraction is
conservative, and schemes without a specific personal rule are browse-only.
Imports are marked `needs_review`, rank slightly below curated schemes, and
re-imports never overwrite curated or reviewed schemes.

### ADR-15: Conditional questions (`showIf`)
The larger catalogue needs more questions (pregnancy, construction-worker board,
ex-servicemen, girl child, income-tax payer). `showIf` keeps the questionnaire short
by asking each question only when it is relevant.

### ADR-16: "Civic broadsheet" visual identity
The UI was redesigned away from a generic SaaS look (purple gradients, rounded
cards, Inter) towards Indian public-print references: Newsreader + IBM Plex
(with Plex Devanagari), paper and ink tokens, hairline rules, ledgers. See DESIGN.md.
Accent colours were darkened after a WCAG contrast check failed on the first pass.

### ADR-17: Hindi for imported schemes via a translation dictionary
The 4,579 imports arrived English-only (NFR-11). Their Hindi is kept in
`data/translations/hi.json`, keyed by the exact English string, rather than in
`catalogue.json` or only in the database: it survives rebuilds, translates
repeated strings once, and naturally flags text that changed upstream. The first
pass was machine translation (Claude, with a style guide for official scheme and
ministry names). It is labelled as unreviewed together with the rules, and
admins check it when they review a scheme.

## Future work
- Prerender scheme pages for SEO; PWA offline support for low connectivity.
- Voice input (FR-14, "Could"). Read-aloud (FR-15) is implemented.
- More regional languages; native-speaker review of the machine-translated Hindi; human review of imported rules.
- CI pipeline (GitHub Actions) running the three test suites. Not added, because
  nothing is pushed anywhere.
