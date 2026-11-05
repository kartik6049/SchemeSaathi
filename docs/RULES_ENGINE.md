# Rules engine

Location: `server/src/engine/` (pure TypeScript, no I/O). Tests: `server/tests/unit/`.

## Data model

```ts
Rule = { groupId: number, field: string, operator: Operator, value: string | number | boolean | string[] }
```

- Rules with the **same `groupId` are AND-ed**.
- **Groups are OR-ed**: the scheme matches if any group matches.
- A **state scheme** (`scheme.state = 'UP'`) automatically gets
  `state = 'UP'` added to every group (`groupRules()` in `evaluate.ts`).
- A scheme with **no rules** matches everyone.

Example (PM-JAY: BPL card holders OR anyone aged 70+):

| groupId | field | operator | value |
|---|---|---|---|
| 1 | bplCard | = | true |
| 2 | age | >= | 70 |

## Operators (`operators.ts`)

`=`, `!=`, `<`, `<=`, `>`, `>=`, `in`, `not_in` (SRS §8.2).

Allowed operators depend on the field type (`validate.ts`):

| Field type | Operators | Value |
|---|---|---|
| `enum` | `= != in not_in` | option value(s) |
| `boolean` | `= !=` | `true` / `false` |
| `number` | `= != < <= > >=` | number within the field's min..max |
| `range` | `< <= > >=` (number) or `= != in not_in` (band keys) | rupees, e.g. `250000` |

## Three-valued evaluation

Each rule evaluates to `pass`, `fail` or `unknown`:

- **unknown**: the user skipped the question, **or**
- **range straddle**: the user picked an income *band*, and the band crosses the
  rule's limit. Bands have inclusive bounds (`fields.ts`). For example, `2_5L_5L`
  is ₹250,001–500,000. Against `incomeRange <= 300000`, the lower bound passes
  and the upper bound fails, so the answer is `unknown`. Asking for bands instead
  of exact income is a privacy choice (SRS §15).

A group fails if any rule fails. Otherwise it is unknown if any rule is unknown,
and it passes if every rule passes. The scheme takes the best status across groups:

| Scheme status | Condition |
|---|---|
| `eligible` | at least one group passes |
| `possible` | none passes, but at least one group has no failures |
| `ineligible` | every group has a failure |

For `possible`, the engine returns:
- `missingFields`: skipped fields across all open groups. The UI turns these into "Answer now" links.
- `uncertainReasons`: range answers that need the exact figure.

## Explanations (`explain.ts`, FR-08)

Satisfied rules from the best group become bilingual strings:

- `Age: 62 ≥ 60` / `उम्र: 62 ≥ 60`
- A lower and upper bound on the same field merge into one line: `Age: 30 (18–40)`
- `Category: Scheduled Caste (SC) (one of SC, ST)`
- Rupee values print in Indian units: `₹2.5 lakh`, `₹1.25 crore`

## Ranking (`rank.ts`, FR-07)

```
score = 0.60 × matchRatio      (fraction of rules passed in the best group)
      + 0.15 × specificity     (min(passedRules, 5) / 5 — targeted schemes first)
      + 0.15 × benefitWeight   (tier 1/2/3 → 0.3/0.6/1.0)
      + 0.10 × deadlineUrgency (≤30 days → 1, none → 0.3, passed → 0)
```

Results are sorted by score descending, with ties broken by English name.

## Profile fields

| Step | Fields | Shown when (`showIf`) |
|---|---|---|
| 1 | `state`* , `area` | always |
| 2 | `age`*, `gender` | always |
| 3 | `maritalStatus`, `pregnantOrLactating` | age ≥ 16; female aged 15–50 |
| 4 | `occupation`, `bocwRegistered` | always; occupation is worker/student/homemaker/unemployed |
| 5 | `incomeRange`, `incomeTaxPayer` | always; age ≥ 18 |
| 6 | `category`, `minority` | always |
| 7 | `student`, `educationLevel` | always |
| 8 | `disability`, `bplCard` | always |
| 9 | `exServiceman`, `hasGirlChild` | age ≥ 18; always |

\* required. A hidden question counts as skipped, and its answer is never sent.
Steps whose questions are all hidden are skipped by the client
(`client/src/features/questionnaire/validation.ts` mirrors `isFieldVisible`).

## Adding a new profile field

1. Add a `FieldDef` to `FIELDS` in `server/src/engine/fields.ts`: `key`, `type`,
   `step` (≤ 2 per step), bilingual `label` and `noun`, `options` if any, and
   `showIf` if it is only relevant to some people.
2. That's it on the server. Validation, the questionnaire API, the admin rule
   builder and explanations all pick it up.
3. Optional: add an icon in `client/src/lib/icons.tsx`.
4. Add unit tests for any new operator semantics.
