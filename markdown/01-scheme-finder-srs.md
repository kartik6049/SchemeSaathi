# Software Requirements Specification (SRS)
# Government Scheme Finder — working name "SchemeSaathi"

| Field | Value |
|-------|-------|
| Document version | 1.0 (Draft) |
| Date | 2 November 2026 |
| Prepared by | [Your Name] |
| Project type | Software (Full-Stack Web) |
| Target roles | SDE, Full-Stack Developer, Backend Developer |
| Standard followed | Structure adapted from IEEE 830 / ISO/IEC/IEEE 29148 |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 02-11-2026 | [Your Name] | Initial draft |

---

## Table of Contents
1. Introduction
2. Overall Description
3. Requirements Engineering Process
4. Functional Requirements
5. External Interface Requirements
6. Non-Functional Requirements
7. Use Cases
8. Data Requirements
9. System Architecture
10. Verification and Acceptance
11. Traceability Matrix
12. Risks and Mitigation
13. Project Plan
14. Success Metrics
15. Appendix: Open Issues and Future Scope

---

## 1. Introduction

### 1.1 Purpose
This document specifies the requirements for SchemeSaathi, a web application that helps citizens find government welfare schemes they are eligible for, understand the benefits, and know what documents are needed to apply. It is intended for the developer(s), mentors, reviewers, and testers of the project.

### 1.2 Problem Statement
Many eligible citizens do not benefit from government schemes because:
- Scheme information is spread across many central and state portals.
- Eligibility criteria are written in complex official language, mostly in English.
- People do not know which documents they need until they visit an office, causing repeated trips.
- Intermediaries sometimes charge money for information that should be free.

### 1.3 Scope
**In scope (v1.0)**
- A guided questionnaire to collect a user's profile (no login required).
- A rules engine that matches the profile against scheme eligibility rules.
- Scheme detail pages with benefits, eligibility, required documents, and the official application link.
- Hindi and English interface.
- An admin panel to add and update schemes and rules without code changes.

**Out of scope (v1.0)**
- Submitting applications on behalf of users.
- Storing Aadhaar numbers or any government ID.
- Verifying a user's documents or real eligibility (the app gives *likely* eligibility only).
- Coverage of every scheme in India (v1.0 targets 100 well-documented schemes).

### 1.4 Definitions and Acronyms

| Term | Meaning |
|------|---------|
| Scheme | A government welfare programme (scholarship, pension, subsidy, insurance, etc.) |
| Eligibility rule | A machine-readable condition, e.g. `age >= 60` |
| Profile | The set of answers a user gives in the questionnaire |
| Match score | How many of a scheme's rules the profile satisfies |
| CSC | Common Service Centre — village-level facilitation centres |
| MoSCoW | Prioritisation: Must, Should, Could, Won't |
| DPDP Act | Digital Personal Data Protection Act, 2023 (India) |
| WCAG | Web Content Accessibility Guidelines |

### 1.5 References
- IEEE Std 830-1998 / ISO/IEC/IEEE 29148:2018 — requirements specification structure.
- myScheme portal (myscheme.gov.in) — reference for scheme information.
- Official central and state department scheme pages.
- Digital Personal Data Protection Act, 2023.
- WCAG 2.1 guidelines.

### 1.6 Document Overview
Section 2 describes the product context. Section 3 records how requirements were gathered. Sections 4–6 list the requirements. Sections 7–14 cover use cases, data, architecture, testing, traceability, risks, plan and metrics.

---

## 2. Overall Description

### 2.1 Product Perspective
SchemeSaathi is a new, standalone web application. It does not replace official portals; it acts as a **discovery and guidance layer** that links users to official sources.

```
                 ┌──────────────────────┐
  Citizen ──────▶│                      │──────▶ Official scheme portals (links only)
  Volunteer ────▶│     SchemeSaathi     │
  CSC operator ─▶│                      │◀────── Admin (adds/updates schemes)
                 └──────────────────────┘
```

### 2.2 Product Functions (Summary)
- Collect user profile through a short, simple questionnaire.
- Match the profile against eligibility rules and rank results.
- Show scheme details, benefits, documents needed, and official links.
- Search and filter schemes by category, state, and beneficiary type.
- Share results via WhatsApp or as a downloadable checklist.
- Let admins manage schemes, rules, and translations.

### 2.3 User Classes and Characteristics

| User class | Description | Tech comfort | Frequency | Priority |
|------------|-------------|--------------|-----------|----------|
| Citizen | Student, farmer, senior citizen, worker, woman entrepreneur | Low–medium; mostly mobile | Occasional | Primary |
| Helper / Volunteer | Family member, NGO worker, CSC operator helping others | Medium | Frequent | Primary |
| Admin | Project maintainer who curates schemes | High | Weekly | Secondary |
| Visitor | Recruiter / reviewer viewing the project | High | Rare | Tertiary |

### 2.4 Operating Environment
- Modern mobile browsers (Chrome on Android 8+) and desktop browsers.
- Must work on low-end phones (2 GB RAM) and slow 3G/4G networks.
- Server: Linux container on a cloud platform (Render/Railway/Fly.io); frontend on Vercel.

### 2.5 Design and Implementation Constraints
- Must not collect or store government ID numbers.
- Free-tier hosting limits (memory, cold starts) must be respected.
- Scheme data must link to official sources; the app must not present itself as a government site.
- All user-facing text must exist in both Hindi and English.

### 2.6 Assumptions and Dependencies
- Official scheme information is publicly available and reasonably accurate.
- Users can answer basic profile questions (age, income range, occupation).
- Scheme rules change occasionally; an admin will update them.
- Translation quality is reviewed by a native Hindi speaker.

---

## 3. Requirements Engineering Process

### 3.1 Stakeholder Analysis

| Stakeholder | Interest | Influence | Engagement |
|-------------|----------|-----------|------------|
| Citizens | Find schemes quickly in their language | High (end users) | Interviews, usability tests |
| Volunteers / CSC operators | Help many people quickly | High | Interviews, observation |
| NGOs | Reach more beneficiaries | Medium | Feedback sessions |
| Developer (you) | Build a strong, deployable project | High | — |
| Mentors / reviewers | Technical quality, impact | Medium | Demo reviews |
| Recruiters | Evidence of skills and impact | Low (indirect) | README, demo video |

### 3.2 Elicitation Techniques

| Technique | Who | Output |
|-----------|-----|--------|
| Semi-structured interviews | 10 citizens, 3 volunteers / CSC operators | Pain points, vocabulary they use |
| Questionnaire (Google Form) | 30+ people | Which schemes they know, devices used, language preference |
| Document analysis | Official scheme pages | Eligibility rule patterns |
| Observation | Visit a CSC or college scholarship desk | Real workflow, common confusions |
| Prototyping | Figma/paper prototype tested with 5 users | Validated questionnaire flow |

### 3.3 Sample Elicitation Questions
1. How did you find out about the last scheme you applied for?
2. What stopped you from applying to a scheme you heard about?
3. Which language do you prefer reading official information in?
4. What phone do you use, and do you usually have mobile data?
5. (Volunteers) What questions do people ask you most often?
6. (Volunteers) How long does it take you to check one person's eligibility today?

### 3.4 Prioritisation Method
Requirements are prioritised with **MoSCoW**:
- **Must** — needed for the MVP to be useful.
- **Should** — important, planned for v1.0 after the MVP.
- **Could** — nice to have if time permits.
- **Won't (this release)** — explicitly deferred.

### 3.5 Requirements Validation
- Review each requirement for being clear, testable, and traceable.
- Walk through the prototype with 5 real users before coding the UI.
- Get one volunteer or CSC operator to review the scheme data for 10 schemes.

---

## 4. Functional Requirements

Format: **ID — Title** | Priority | Description | Acceptance criteria

### 4.1 Profile Questionnaire

**FR-01 — Guided questionnaire** | Must
The system shall present a step-by-step questionnaire collecting: state, age, gender, annual family income range, occupation, social category, disability status, student status and education level.
*Acceptance:* A user can complete the questionnaire in under 2 minutes; each step shows at most 2 questions.

**FR-02 — No login required** | Must
The system shall allow a user to get results without creating an account.
*Acceptance:* Results are shown without any sign-up prompt blocking access.

**FR-03 — Skip and edit answers** | Must
The system shall let users skip non-mandatory questions and go back to edit previous answers.
*Acceptance:* Editing an answer updates results without restarting the questionnaire.

**FR-04 — Save progress locally** | Could
The system shall save in-progress answers in the browser so a refresh does not lose them.

### 4.2 Eligibility Matching

**FR-05 — Rules engine** | Must
The system shall evaluate each scheme's eligibility rules against the user profile and classify schemes as *Eligible*, *Possibly eligible* (unknown fields), or *Not eligible*.
*Acceptance:* Unit tests for at least 30 schemes produce the expected classification.

**FR-06 — Rules stored as data** | Must
Eligibility rules shall be stored in the database as structured data (field, operator, value, logic group), not hard-coded.
*Acceptance:* An admin can add a new scheme with rules and it appears in results without redeploying.

**FR-07 — Ranked results** | Must
The system shall rank eligible schemes by relevance (match score, benefit size category, and deadline proximity).

**FR-08 — Explain match** | Should
For each result, the system shall show why the user matches (e.g. "Age 62 ≥ 60", "Income below ₹2 lakh").

### 4.3 Scheme Information

**FR-09 — Scheme detail page** | Must
Each scheme page shall show: name, ministry/department, benefits, eligibility in plain language, required documents, how to apply, official link, and last-verified date.

**FR-10 — Document checklist** | Should
The system shall generate a combined, de-duplicated document checklist for all schemes the user selects, downloadable as PDF.

**FR-11 — Search and filter** | Should
Users shall be able to search schemes by keyword and filter by category, state, and beneficiary type.

**FR-12 — Share results** | Should
Users shall be able to share a results link or summary via WhatsApp.

### 4.4 Language and Accessibility

**FR-13 — Bilingual interface** | Must
All UI text and scheme summaries shall be available in Hindi and English, switchable at any time.

**FR-14 — Voice input** | Could
Users shall be able to answer questions by voice (browser speech recognition).

**FR-15 — Read aloud** | Could
Scheme summaries shall have a "read aloud" option.

### 4.5 Administration

**FR-16 — Admin authentication** | Must
Admin features shall require secure login.

**FR-17 — Manage schemes** | Must
Admins shall be able to create, edit, deactivate, and preview schemes and their rules.

**FR-18 — Rule validation** | Should
The admin panel shall validate rules (valid fields, operators, value types) before saving.

**FR-19 — Stale data flag** | Should
Schemes not verified for more than 180 days shall be flagged in the admin dashboard.

**FR-20 — Usage analytics** | Could
Admins shall see anonymous statistics: questionnaire completions, top viewed schemes, drop-off steps.

### 4.6 Won't Have (this release)
- WH-01: Online application submission.
- WH-02: User accounts with saved profiles.
- WH-03: Aadhaar/DigiLocker integration.

---

## 5. External Interface Requirements

### 5.1 User Interface
- Mobile-first responsive design; minimum tap target 44×44 px.
- One primary action per screen in the questionnaire.
- Simple icons alongside text for low-literacy users.
- Clear disclaimer on every results page: "Results show likely eligibility. Please confirm on the official portal."

### 5.2 Software Interfaces

| Interface | Purpose |
|-----------|---------|
| REST API (`/api/questions`, `/api/match`, `/api/schemes`, `/api/schemes/:id`) | Frontend ↔ backend |
| PostgreSQL | Schemes, rules, translations, admin users |
| Search engine (Postgres FTS or Meilisearch) | Scheme search |
| Web Speech API (browser) | Optional voice input |

### 5.3 Communication Interfaces
- HTTPS only (TLS 1.2+).
- JSON request/response format.
- WhatsApp share via `wa.me` deep link (no WhatsApp API needed).

### 5.4 Sample API Contract
```http
POST /api/match
Content-Type: application/json

{
  "state": "UP",
  "age": 62,
  "gender": "female",
  "incomeRange": "below_2L",
  "occupation": "farmer",
  "category": "OBC",
  "disability": false,
  "student": false
}
```
```json
{
  "eligible": [
    { "schemeId": "pm-kisan", "score": 0.95, "reasons": ["occupation = farmer"] }
  ],
  "possiblyEligible": [
    { "schemeId": "old-age-pension-up", "missingFields": ["bplCard"] }
  ]
}
```

---

## 6. Non-Functional Requirements

| ID | Category | Requirement | Measure |
|----|----------|-------------|---------|
| NFR-01 | Performance | Match API responds quickly | p95 < 500 ms for 200 schemes |
| NFR-02 | Performance | Fast first load on slow networks | Largest Contentful Paint < 3 s on simulated 3G |
| NFR-03 | Scalability | Handle traffic spikes (e.g. scholarship season) | 100 concurrent users without errors (load test) |
| NFR-04 | Availability | Service is reachable | ≥ 99% monthly uptime (monitored) |
| NFR-05 | Security | Admin protected | Hashed passwords (bcrypt/argon2), rate-limited login, HTTPS |
| NFR-06 | Security | Input safety | All inputs validated server-side; OWASP Top 10 checked |
| NFR-07 | Privacy | Minimal data | No names, phone numbers or IDs stored; profiles not persisted server-side |
| NFR-08 | Privacy | Compliance | Privacy notice aligned with DPDP Act 2023 principles |
| NFR-09 | Usability | Easy to complete | ≥ 80% of test users complete the questionnaire unaided |
| NFR-10 | Accessibility | Inclusive design | WCAG 2.1 AA for colour contrast, labels, keyboard navigation |
| NFR-11 | Localisation | Full Hindi support | 100% of UI strings translated |
| NFR-12 | Maintainability | Code quality | ≥ 70% test coverage on rules engine; linting in CI |
| NFR-13 | Portability | Easy deployment | Runs via Docker Compose locally |
| NFR-14 | Accuracy | Trustworthy data | Every scheme shows source link and last-verified date |

---

## 7. Use Cases

### UC-01: Citizen finds eligible schemes
| Field | Detail |
|-------|--------|
| Actor | Citizen |
| Precondition | User opens the website |
| Main flow | 1. User selects language. 2. User answers questionnaire. 3. System evaluates rules. 4. System shows ranked eligible schemes. 5. User opens a scheme detail page. |
| Alternate flow | 2a. User skips a question → affected schemes shown as "Possibly eligible". |
| Postcondition | User sees schemes and knows required documents |
| Related FRs | FR-01, FR-02, FR-05, FR-07, FR-09, FR-13 |

### UC-02: Volunteer helps multiple people
| Field | Detail |
|-------|--------|
| Actor | Volunteer / CSC operator |
| Main flow | 1. Completes questionnaire for person A. 2. Downloads checklist PDF. 3. Clicks "Start new" and repeats for person B. |
| Postcondition | Each person gets a checklist |
| Related FRs | FR-01, FR-10, FR-12 |

### UC-03: Admin adds a new scheme
| Field | Detail |
|-------|--------|
| Actor | Admin |
| Precondition | Admin is logged in |
| Main flow | 1. Opens "New scheme". 2. Enters details and translations. 3. Adds eligibility rules. 4. System validates rules. 5. Admin previews and publishes. |
| Alternate flow | 4a. Invalid rule → system shows error and blocks publish. |
| Postcondition | Scheme appears in matching results |
| Related FRs | FR-06, FR-16, FR-17, FR-18 |

---

## 8. Data Requirements

### 8.1 Entity Overview
```
Scheme (id, slug, name_en, name_hi, ministry, state, category,
        benefits_en, benefits_hi, how_to_apply, official_url,
        last_verified_at, is_active)

EligibilityRule (id, scheme_id, group_id, field, operator, value, value_type)
    -- rules in the same group are AND-ed; groups are OR-ed

Document (id, name_en, name_hi)
SchemeDocument (scheme_id, document_id)

AdminUser (id, email, password_hash, role, created_at)
AnalyticsEvent (id, event_type, scheme_id, step, created_at)   -- anonymous
```

### 8.2 Data Rules
- Supported operators: `=`, `!=`, `<`, `<=`, `>`, `>=`, `in`, `not_in`.
- User profiles are processed in memory and **not stored** on the server.
- Analytics events contain no personal data.
- Daily database backups.

---

## 9. System Architecture

### 9.1 High-Level Design
```
┌───────────────┐      HTTPS/JSON      ┌──────────────────┐
│  Next.js UI   │ ───────────────────▶ │   API service    │
│ (Vercel, i18n)│                      │ (Node/FastAPI)   │
└───────────────┘                      │  ├─ Rules engine │
                                       │  ├─ Search       │
                                       │  └─ Admin APIs   │
                                       └────────┬─────────┘
                                                │
                                       ┌────────▼─────────┐
                                       │   PostgreSQL     │
                                       └──────────────────┘
```

### 9.2 Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | Next.js, TypeScript, Tailwind CSS | SEO, performance, type safety |
| i18n | next-intl or i18next | Hindi/English |
| Backend | Node.js (NestJS/Express) or Python FastAPI | REST API, rules engine |
| Database | PostgreSQL | Relational rules and schemes |
| Search | Postgres full-text (MVP), Meilisearch (later) | Simple first, scale later |
| PDF | Server-side PDF generation library | Checklist download |
| Testing | Jest/Pytest, Playwright | Unit + end-to-end |
| CI/CD | GitHub Actions | Tests + deploy on push |
| Monitoring | UptimeRobot, Sentry | Uptime and error tracking |

### 9.3 Key Design Decisions (record in DECISIONS.md)
- **Rules as data:** schemes change often; avoids code changes per scheme.
- **No accounts in v1.0:** reduces privacy risk and friction.
- **Stateless matching:** profile sent per request, nothing stored.

---

## 10. Verification and Acceptance

### 10.1 Test Strategy

| Level | What | Tool |
|-------|------|------|
| Unit | Rules engine operators and groups | Jest / Pytest |
| Integration | API + database | Supertest / HTTPX |
| End-to-end | Questionnaire → results → detail | Playwright |
| Performance | `/api/match` under load | k6 or Locust |
| Usability | 5–10 real users complete tasks | Observation + SUS questionnaire |
| Accessibility | Contrast, labels, keyboard | Lighthouse, axe |

### 10.2 Release Acceptance Criteria (v1.0)
- All **Must** requirements implemented and tested.
- 100 schemes loaded with verified data and Hindi translations.
- p95 match latency < 500 ms.
- At least 20 real users tested; ≥ 80% completed the questionnaire unaided.
- Deployed with public URL, README, and demo video.

---

## 11. Traceability Matrix

| Requirement | Use case | Design element | Test |
|-------------|----------|----------------|------|
| FR-01 | UC-01, UC-02 | Questionnaire component | E2E-01 |
| FR-02 | UC-01 | No auth on public routes | E2E-01 |
| FR-05 | UC-01 | Rules engine | UT-RULES-* |
| FR-06 | UC-03 | EligibilityRule table | IT-ADMIN-02 |
| FR-07 | UC-01 | Ranking function | UT-RANK-01 |
| FR-09 | UC-01 | Scheme detail page | E2E-02 |
| FR-10 | UC-02 | PDF service | IT-PDF-01 |
| FR-13 | UC-01 | i18n layer | E2E-03 |
| FR-17 | UC-03 | Admin CRUD APIs | IT-ADMIN-01 |
| FR-18 | UC-03 | Rule validator | UT-VALID-01 |
| NFR-01 | — | Indexed queries, caching | PERF-01 |
| NFR-07 | — | Stateless matching | Code review + IT-PRIV-01 |

---

## 12. Risks and Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Scheme data becomes outdated | High | High | Last-verified date, stale flag (FR-19), link to official source |
| Wrong eligibility shown | Medium | High | Unit tests per scheme, "likely eligible" wording, disclaimer |
| Poor Hindi translation | Medium | Medium | Native speaker review |
| Low user adoption | Medium | Medium | Partner with college scholarship cell or an NGO |
| Free hosting cold starts | High | Low | Keep-alive ping or paid tier later |
| Scope creep (too many schemes) | High | Medium | Fixed 100-scheme target for v1.0 |

---

## 13. Project Plan

### 13.1 Milestones

| Week | Milestone | Deliverables |
|------|-----------|--------------|
| 1 | Requirements & research | Interviews done, this SRS finalised, 50 schemes researched, DB schema |
| 2 | Core engine | Rules engine + match API + unit tests |
| 3 | Frontend MVP | Questionnaire, results, scheme detail pages |
| 4 | MVP release | Hindi support, deployment, first 20 users |
| 5 | v1.0 features | Admin panel, search, checklist PDF, analytics |
| 6 | Polish & showcase | Load test, accessibility fixes, README, demo video, LinkedIn post |

### 13.2 Definition of Done (per feature)
- Code reviewed (self-review checklist if solo).
- Tests written and passing in CI.
- Works on a low-end Android phone.
- Translated into Hindi.

---

## 14. Success Metrics

| Metric | Target |
|--------|--------|
| Schemes covered | 100 (v1.0) |
| Real users | 50+ |
| Questionnaire completion rate | ≥ 70% |
| Average eligible schemes found per user | Track and report |
| User satisfaction (SUS score) | ≥ 70 |
| Match API p95 latency | < 500 ms |

**Resume bullet template**
> Built SchemeSaathi, a bilingual scheme-eligibility platform with a data-driven rules engine covering 100+ government schemes; used by X users, helping each discover Y eligible schemes on average.

---

## 15. Appendix: Open Issues and Future Scope

**Open issues**
- How to handle schemes with very complex or subjective eligibility (e.g. "economically weaker")?
- Should income be asked as exact value or ranges? (Ranges preferred for privacy; validate with users.)

**Future scope**
- Regional languages (Tamil, Bengali, Marathi, etc.).
- WhatsApp chatbot version.
- Deadline reminders with opt-in notifications.
- Optional user accounts to track applications.
