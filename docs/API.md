# API reference

Base URL: `/api`. JSON in and out. Errors always look like:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid request", "details": [{ "path": "age", "message": "..." }] } }
```

| Code | HTTP | When |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Body/query failed zod validation |
| `BAD_JSON` | 400 | Malformed JSON |
| `UNAUTHORIZED` | 401 | Missing / invalid admin session |
| `NOT_FOUND` | 404 | Unknown scheme / route |
| `CONFLICT` | 409 | Duplicate slug |
| `INVALID_RULES` | 422 | Eligibility rules failed validation (`details: [{ index, message }]`) |
| `RATE_LIMITED` | 429 | Too many requests (300/min API, 10/15min login) |

## Public

### `GET /api/health`
`{ "status": "ok", "db": "up" }` (503 if the DB is down).

### `GET /api/questions`
The questionnaire, generated from the field registry.
```json
{ "totalSteps": 7, "steps": [{ "step": 1, "fields": [
  { "key": "state", "type": "enum", "required": true,
    "label": { "en": "Which state or UT do you live in?", "hi": "..." },
    "options": [{ "value": "UP", "label": { "en": "Uttar Pradesh", "hi": "उत्तर प्रदेश" } }] } ] }] }
```

### `POST /api/match`
Body: any subset of profile fields. Skipped, `null` and `""` are treated as unknown,
and unknown keys are ignored.
```json
{ "state": "UP", "age": 62, "gender": "female", "incomeRange": "below_1L",
  "occupation": "farmer", "category": "obc", "disability": false, "student": false }
```
Profile keys: `state, area, age, gender, occupation, incomeRange, category, minority,
student, educationLevel, disability, bplCard, maritalStatus`. See `GET /api/questions` for the options.

Response (`Cache-Control: no-store`):
```json
{
  "eligible": [{
    "schemeId": "pm-kisan", "score": 0.75, "deadlinePassed": false,
    "reasons": [{ "field": "occupation", "text": { "en": "Occupation: Farmer", "hi": "व्यवसाय: किसान" } }],
    "scheme": { "slug": "pm-kisan", "name": { "en": "...", "hi": "..." }, "category": "agriculture", "...": "..." }
  }],
  "possiblyEligible": [{ "schemeId": "up-old-age-pension", "missingFields": ["bplCard"], "uncertainReasons": [], "...": "..." }],
  "counts": { "eligible": 9, "possible": 8, "notEligible": 28, "total": 45 }
}
```

### `GET /api/schemes?q=&category=&state=&beneficiary=&page=1&limit=20`
Full-text search with prefix matching, in English or Hindi. `state=MH` returns MH schemes plus central ones.
→ `{ items: SchemeSummary[], total, page, limit, pages }`

### `GET /api/schemes/meta`
Filter options: `{ categories, beneficiaryTypes, states }`, each as `{ value, label: {en, hi} }`.

### `GET /api/schemes/:slug`
Full scheme: summary fields plus `benefits`, `eligibility`, `howToApply`, `officialUrl`,
`lastVerifiedAt`, `rules[]`, `documents[{ code, name }]`. Returns 404 if the scheme is unknown or inactive.

### `POST /api/checklist`
`{ "schemeIds": ["pm-kisan", "pm-fasal-bima-yojana"] }` → documents de-duplicated, most-needed first:
```json
{ "schemes": [{ "slug": "...", "name": {}, "officialUrl": "..." }],
  "documents": [{ "code": "aadhaar", "name": {}, "schemes": [{ "slug": "pm-kisan", "name": {} }] }] }
```

### `POST /api/checklist/pdf`
`{ "schemeIds": [...], "lang": "hi" }` → `application/pdf` attachment.

### `POST /api/events`
`{ "type": "scheme_view", "schemeSlug"?: "pm-kisan", "step"?: 3 }` → 204.
Types: `questionnaire_start, step_complete, questionnaire_complete, scheme_view, checklist_download, share`.

## Admin (httpOnly cookie session)

| Method | Path | Body / notes |
|---|---|---|
| POST | `/api/admin/auth/login` | `{ email, password }` → sets `ss_admin` cookie (8h) |
| POST | `/api/admin/auth/logout` | clears cookie |
| GET | `/api/admin/auth/me` | `{ admin: { id, email, role } }` |
| GET | `/api/admin/schemes` | all schemes + `ruleCount`, `isStale` |
| GET | `/api/admin/schemes/:id` | full scheme |
| POST | `/api/admin/schemes` | `SchemeInput` → 201 |
| PUT | `/api/admin/schemes/:id` | `SchemeInput` (replaces rules & documents) |
| PATCH | `/api/admin/schemes/:id/status` | `{ isActive }` |
| POST | `/api/admin/schemes/:id/verify` | sets last-verified to today |
| POST | `/api/admin/rules/validate` | `{ rules }` → `{ valid, errors }` |
| POST | `/api/admin/preview` | `{ state, rules, profile }` → evaluation |
| GET | `/api/admin/documents` | document catalogue |
| GET | `/api/admin/fields` | rule-builder metadata |
| GET | `/api/admin/stats` | usage (30 days) + catalogue health |

`SchemeInput`:
```json
{ "slug": "my-scheme", "name": {"en":"", "hi":""}, "ministry": {...}, "state": null | "UP",
  "category": "education", "beneficiaryTypes": ["student"], "summary": {...}, "benefits": {...},
  "eligibility": {...}, "howToApply": {...}, "officialUrl": "https://...", "benefitTier": 1|2|3,
  "deadline": "2026-12-31" | null, "lastVerifiedAt"?: "2026-10-20", "isActive"?: true,
  "rules": [{ "groupId": 1, "field": "age", "operator": ">=", "value": 18 }],
  "documents": ["aadhaar", "income_cert"] }
```
