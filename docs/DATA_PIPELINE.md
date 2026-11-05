# Data pipeline: importing the full scheme catalogue

SchemeSaathi ships with **45 hand-curated schemes** (bilingual, rules written by
hand). It also imports **~4,600 schemes** from public myScheme data, so the
catalogue covers central and state schemes across all 36 states and UTs.

```
data/download.sh ─▶ data/raw/ ─▶ npm run data:extract ─▶ data/processed/details.json
                                 npm run data:build   ─▶ data/processed/catalogue.json + report.json
                                    ▲  (Hindi from data/translations/hi.json)
                                    └─ npm run data:translate:export / :merge   (see §5)
                                 npm run db:import    ─▶ PostgreSQL (schemes, rules, documents)
```

## 1. Download (terminal only)

```bash
./data/download.sh
```

| Source | What it gives | Licence / note |
|---|---|---|
| `github.com/S-Raha23/JanSahayak` → `schemes_full.json` | myScheme search index: **4,651** schemes with name, short description, tags, categories, states, ministry, audience, close date | The repo has **no licence**; the content is public myScheme metadata. Attribute myScheme. |
| `huggingface.co/datasets/shrijayan/gov_myscheme` | **600** myScheme scheme pages as PDF, with full Details / Benefits / Eligibility / Application process / Documents | Apache-2.0; the card asks users to credit myScheme |
| GitHub commit API | Date the index snapshot was committed (`SNAPSHOT_DATE`) | used as "last verified" for imports |

All downloads go to `data/raw/` (git-ignored). They are parsed as data and never executed.

> **For production:** ask NeGD / myScheme (the Digital India Corporation) for an
> official data feed or API access, and re-run the pipeline from that source.

## 2. Extract PDF text (`scripts/data/extract-pdfs.ts`)

`pdfjs-dist` extracts text from each PDF. `src/importer/pdfSections.ts` then:
- repairs mojibake (`â€œ` → `"`)
- finds the section headings in order: Details → Benefits → Eligibility → Application Process → Documents Required → FAQ
- splits run-together sentences and document lists ("Aadhaar CardIncome Certificate" → two items)
- pulls out the department name ("…is a scheme by the Department of X")

Result: 600/600 PDFs parsed, of which 540 match the index (`data/processed/details.json`).

## 3. Build the catalogue (`scripts/data/build-catalogue.ts`)

For every index record, `src/importer/mapMyScheme.ts`:

| Step | How |
|---|---|
| State | name → code (`Uttar Pradesh` → `UP`). One state sets `scheme.state`; several become an explicit `state in [...]` rule |
| Category | myScheme category → app category; tags override (Pension / Insurance / Scholarship) |
| Rules | `src/importer/extractRules.ts` (below) |
| Audience | `schemeFor = Infra` → `organisation` (browse-only, never matched) |
| Matchable | only if at least one *specific* personal rule was found; generic-only rules (age band, area, income) → browse-only |
| Documents | keyword-mapped to known codes (`aadhaar`, `income_cert` …); anything else becomes a new `x-<slug>` document |
| Text | summary = short description; benefits, eligibility and how-to-apply come from the PDF when available |
| Hindi | filled from the translation dictionary `data/translations/hi.json` (§5); strings without a translation stay empty and the UI falls back to English |
| Link | `https://www.myscheme.gov.in/schemes/<slug>` (official government page) |
| Provenance | `source='myscheme'`, `needs_review=true`, `import_notes` = the signals that produced each rule |

Duplicates of curated schemes are skipped through `CURATED_ALIASES`; the curated version wins.
Near-duplicates are listed in the build output for manual review.

### Rule extraction heuristics (`extractRules.ts`)

The extractor is **conservative**: it emits a rule only when a tag or an unambiguous phrase supports it.

| Signal | Rule |
|---|---|
| tags Women / Girl / Widow / Mother, "women applicants" | `gender = female` |
| tags Widow | `maritalStatus = widowed` |
| tags SC / ST / OBC / Tribal, "belongs to Scheduled Caste" | `category in [...]` |
| tags Minority / Muslim / Sikh … | `minority = true` |
| tags Disability / PwD / Divyang, "persons with disability" | `disability = true` |
| tags Student / Scholarship; Pre-/Post-Matric | `student = true`; `educationLevel in [...]` |
| tags Farmer / Fishermen / Weaver / Street Vendor / Artist / Sportsperson | `occupation = …` |
| tags Construction Worker / BOCW | `bocwRegistered = true` |
| tags Ex-Servicemen | `exServiceman = true` |
| tags Girl Child / Daughter | `hasGirlChild = true` |
| tags Pregnant Women / Maternity | `pregnantOrLactating = true` (+ female) |
| tags BPL / Antyodaya | `bplCard = true` |
| "between 18 and 40 years", "60 years or above", "below 35 years" | `age >= / <=` (ignores ages of daughters, children, the deceased) |
| "annual family income should not exceed ₹2,50,000", "monthly income ₹15,000" (×12) | `incomeRange <= …` |
| "should not be an income tax payer" | `incomeTaxPayer = false` |

**Identity tags become OR groups.** Tags list who can benefit, often as
alternatives ("girls, SC/ST boys and BPL children"). AND-ing them would exclude
almost everyone, so when there are two or more identity conditions (gender,
category, BPL, disability, minority), each becomes its own OR group that shares
the remaining conditions.

Every extracted rule passes the same `validateRules` used by the admin panel.

### Current build report

| | |
|---|---|
| Imported schemes | 4,579 (plus 45 curated = **4,624**) |
| With full PDF details | 538 |
| Auto-matchable | 2,670 |
| Browse/search only | 1,909 (735 of them organisation-level) |
| New document types | 1,301 |
| Skipped curated duplicates | 35 |

Most common signals: student (826), female (400), entrepreneur (399), farmer (374),
construction worker (330), disability (290), age from text (207).

## 4. Import (`npm run db:import`)

Idempotent, committed in batches of 250:
- new slugs are inserted
- existing **un-reviewed** imports are refreshed
- curated, admin-created and **reviewed** schemes are never overwritten

Takes about 3–5 minutes on the development laptop.

## 5. Hindi translation (`data/translations/`)

Hindi for imported schemes lives in a dictionary, `data/translations/hi.json`,
that maps each **exact English string** to its Hindi. It is kept out of
`data/processed/` so rebuilds don't lose it, and it is the only file under
`data/` that belongs in version control. `data:build` fills every empty `hi`
field (name, ministry, summary, benefits, eligibility, how-to-apply, and new
document names) from it.

```bash
npm run data:translate:export   # untranslated strings → data/translations/work/todo/NNNN.json (~6,000 chars each)
# translate: write work/done/NNNN.json as { "<id>": "<Hindi>" } (follow data/translations/GUIDE.md)
npm run data:translate:merge -- --check 0007   # validate one chunk
npm run data:translate:merge                   # merge all finished chunks into hi.json
npm run data:build && npm run db:import
```

- Repeated strings (ministries, document names) are translated once.
- If myScheme changes an English text, its key no longer matches. The next `export` lists it again, and the old translation is simply unused.
- The merge rejects empty, non-Devanagari, suspiciously short (truncated) and re-flowed output (line count differs from the English).
- `export` renumbers the ids, so it moves unmerged `work/done/` chunks to `work/archive/<time>/` instead of letting them be merged against the wrong English. Merge before re-exporting.
- `db:import` refreshes un-reviewed imports with the new Hindi, and fills empty Hindi document names. Hindi typed by an admin is never overwritten.

**Translating on Google Colab (free, open-source model):** `data/translations/translate_hindi_colab.ipynb`
does the "translate" step with [IndicTrans2](https://huggingface.co/ai4bharat/indictrans2-en-indic-1B)
(AI4Bharat, MIT) on a free Colab T4 GPU. The notebook's first cell has the full steps:

```bash
cd data/translations && zip -r work.zip work         # upload work.zip to the notebook, Run all
cd work && unzip -o ~/Downloads/done.zip             # its output → data/translations/work/done/NNNN.json
cd ../../../server && npm run data:translate:merge && npm run data:build && npm run db:import
```

It splits each string into lines and sentences (the model translates one sentence at a time), keeps bullet
and step markers, skips chunks already in `done/`, and applies the same checks as the merge.

**Current state (2026-11-04):** 153 of 490 chunks (6,050 of 12,006 unique strings) are translated in
`work/done/`, but not merged yet, so `hi.json` doesn't exist and the catalogue has no Hindi.
Run the Colab notebook to finish the remaining 337 chunks (≈1.8 M characters). The translations are
machine-made and have **not** been reviewed by a native speaker. Reviewing the Hindi is part of
reviewing each scheme (below).

## Reviewing imported schemes

Admin → Schemes → **Needs review**. For each scheme:
1. Read the official myScheme page (linked in the *Review* tab).
2. Fix the rules in the rule builder; the *Review* tab shows which signals produced them.
3. Check the Hindi text (machine-translated; fix names and terms that read oddly).
4. Untick **Needs review** and save. Future imports will no longer touch the scheme.

Unreviewed schemes are labelled "Auto-imported · not yet reviewed" for citizens, and
rank slightly below hand-checked schemes with the same match.

## Full rebuild

```bash
./data/download.sh
cd server
npm run data:extract && npm run data:build && npm run db:import
# Hindi for any new/changed text: data:translate:export → translate → data:translate:merge, then data:build + db:import again
```
