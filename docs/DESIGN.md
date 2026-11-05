# Design system — "civic broadsheet"

## Identity

SchemeSaathi is a public-service guide that people need to **trust**, so its
visual language borrows from Indian public print: the gazette notice, the
newspaper front page, the India Post form and the ration-card ledger. The goal
is to look like considered public information, not a SaaS dashboard.

| Principle | In practice |
|---|---|
| Paper & ink | warm paper background with a faint grain, near-black warm ink |
| Rules over boxes | hairline and 2px rules separate content; cards only for dialogs |
| Editorial hierarchy | serif headlines, small-caps kickers, generous measure (≤ 68ch) |
| Asymmetry | main column + margin column (facts, summary rail, notice) |
| One action colour | deep civic green; marigold only for highlights and active marks |
| Honest status | status colour is always paired with an icon and a label |

## Tokens (`client/src/index.css`)

All colours are CSS variables, redefined for `.dark`, and exposed to Tailwind as
semantic utilities (`bg-paper`, `text-ink-2`, `border-rule`, `bg-primary` …).

| Token | Light | Dark | Use |
|---|---|---|---|
| `paper` | `#f3eee4` | `#121310` | page background |
| `surface` / `surface-2` | `#fbf8f2` / `#ebe4d6` | `#1a1c18` / `#23261f` | inputs, hover rows, skeletons |
| `rule` / `rule-strong` | `#d6cbb7` / `#1c1b17` | `#34372f` / `#e9e3d6` | hairlines / section rules |
| `ink` / `ink-2` / `ink-3` | `#1c1b17` / `#4b463d` / `#6b6459` | `#ece6d9` / `#bdb6a7` / `#8b8578` | text levels |
| `primary` | `#1f4d3a` | `#8cc5a0` | the main action, links on hover, progress |
| `accent` | `#946013` (ochre) | `#e6ac4a` | numerals, active underline, notices |
| `ok` / `warn` / `bad` | green / amber / vermilion | lighter equivalents | eligible / possibly / problem |

## Typography

| Role | Font | Size | Notes |
|---|---|---|---|
| Display & headings | **Newsreader** (variable, optical sizes) | 36–76px display, 28–36px page, 20–24px section | `tracking-tight`, italics for emphasis |
| UI & body | **IBM Plex Sans** + **IBM Plex Sans Devanagari** | 15–16px body, 13–14px secondary | one family across scripts |
| Kicker / metadata | Plex Sans, uppercase, `tracking-[0.14em]` | 11px | `.kicker` class |
| Numbers | `tabular-nums lining-nums` | — | `.num` class |

Weights used: 400, 500, 600. In Hindi, `.font-serif` headings switch to Plex
Devanagari 600, because Newsreader has no Devanagari.

## Components (`client/src/components/ui`)

| Component | Notes |
|---|---|
| `Button` / `ButtonLink` | 5px radius; primary / secondary (ink outline) / ghost / danger / whatsapp; ≥ 44px tall |
| `OptionTile` | form-style row: square check mark + label + optional icon; `role="radio"` |
| `Field` (`Input`, `Select`, `Textarea`, `FormField`) | flat rectangles on paper; accessible error wiring |
| `Label`, `Status` | small-caps label with a square marker; `Status` adds an icon (colour never alone) |
| `Panel` | the only "card"; used for dialogs and forms |
| `States` | loading, error (margin note), empty (ruled notice), skeleton |

## Page compositions

| Page | Composition |
|---|---|
| Home | headline column + notice column with live counts; numbered steps divided by vertical rules; book-style **index of schemes** with dotted leaders and counts; volunteer pull-quote |
| Questionnaire | large serif step numeral in the margin (`03 / 09`), questions on the right, segmented progress ticks |
| Results | serif headline sentence; ledger rows (status icon, metadata line, serif name, reasons); sticky summary rail with big counts, share and checklist |
| Browse | underlined serif search field; filter index (subjects with counts) in the left column; ledger rows |
| Detail | article: kicker, headline, italic deck; numbered sections 01–04; "At a glance" fact sheet in the margin |
| Admin | same tokens, denser: stat strip, ruled tables, text-tab filters, pagination |

## Motion

- `animate-rise`: content rises 10px and fades in on entry; rows are staggered 30–35ms.
- `animate-draw`: rules draw left to right.
- Nav underline grows from the left on hover and when active; the logo seal tilts on hover.
- Everything is disabled under `prefers-reduced-motion`.

## Accessibility checklist

- 44px minimum targets; visible marigold focus ring; skip link.
- Radios, tabs, dialogs and progress bars use the right roles; question steps move focus.
- Status is never colour-only. Every text token passes WCAG AA (≥ 4.5:1) on paper and surface in both themes. The first pass failed (ink-3 4.0, marigold 2.7, warn 4.4), so those were darkened to the values above.
- `lang` is set per language, and on Hindi/English text in the admin preview.
