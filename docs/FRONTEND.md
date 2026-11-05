# Frontend guide (`client/`)

React 19 + Vite + TypeScript + Tailwind v4 + react-router 7 + i18next.
Visual identity, tokens and layout rules are documented in [DESIGN.md](DESIGN.md).

## Scripts
`npm run dev` (http://localhost:5173, proxies `/api` → :4000) · `npm run build` · `npm test` · `npm run typecheck`

## Structure

| Path | What it does |
|---|---|
| `src/main.tsx` | Bootstraps CSS, i18n, providers, router |
| `src/App.tsx` | Route table; admin routes lazy-loaded (separate chunk) |
| `src/index.css` | Design tokens as CSS variables (light + dark), Tailwind theme mapping, fonts, paper grain, `.kicker` / `.num` / `.link`, print rules |
| **lib/** | Framework-free helpers |
| `lib/api.ts` | Typed API client (`api.match`, `api.admin.create`, …), `ApiError` |
| `lib/types.ts` | Response types mirroring the server |
| `lib/profileCodec.ts` | Profile ⇄ URL-safe base64 for `/results?p=` |
| `lib/storage.ts` | localStorage that never throws |
| `lib/analytics.ts` | Fire-and-forget anonymous events |
| `lib/share.ts`, `format.ts`, `icons.tsx`, `cn.ts` | WhatsApp link, dates, icon maps, classnames |
| **i18n/** | `en.json`, `hi.json` (identical keys, enforced by a test), `index.ts` setup, `useLocalized()` |
| **context/** | `ProfileContext` (answers + step, persisted), `ThemeContext`, `AdminAuthContext` |
| **hooks/** | `useResource` (fetch + cancel), `useCached` (questions/meta shared cache), `useDebounce`, `useSpeech` (read aloud) |
| **components/ui/** | `Button`/`ButtonLink`, `Panel`, `Label`/`Status`, `OptionTile` (form row), `Field` (Input/Select/Textarea/FormField), `States`, `Spinner` |
| **components/layout/** | `Layout`, `Header` (masthead + dateline), `Footer` (colophon + sources), `Logo`/`Seal`, `LanguageToggle` (EN \| हिं), `ThemeToggle`, `Disclaimer` |
| **features/questionnaire/** | `QuestionnairePage` (margin numeral, visible-step navigation), `QuestionField`, `ProgressBar` (segmented), `validation.ts` (`showIf`, steps, sanitise) |
| **features/results/** | `ResultsPage` (ledger + summary rail, show more), `ResultRow`, `ChecklistDialog` |
| **features/schemes/** | `SchemesPage` (filter index + ledger), `SchemeRow`, `SchemeDetailPage` (article + fact sheet), `SchemeMeta` (metadata line, review mark) |
| **features/admin/** | `AdminRoutes`, `AdminLayout` (guard), `AdminLoginPage`, `AdminDashboard`, `AdminSchemesPage`, `SchemeEditorPage`, `RuleBuilder`, `ruleUtils.ts` |
| **pages/** | `HomePage`, `PrivacyPage`, `NotFoundPage` |

## Conventions

- **Bilingual content**: API text is `{ en, hi }`. Use `const { l, untranslated } = useLocalized(); l(scheme.name)`.
  Imported schemes have machine-translated Hindi; for any string still missing it, `l()` falls back to English and `untranslated()` lets you show the "Hindi pending" note.
  UI strings go through `t('key')`. Add every new key to **both** JSON files.
- **Questions are data**: never hard-code questions. They come from `/api/questions`.
- **Accessibility**: 44px minimum tap targets (`min-h-11`), radio semantics on option
  tiles, labelled controls (`FormField`), a skip link, focus moved to each new question
  step, `prefers-reduced-motion` respected, and colour never the only signal (icons + text).
- **Theming**: Tailwind `dark:` variants; `.dark` on `<html>` is set before paint
  by an inline script in `index.html`.
- **Effects** must return nothing or a cleanup function. Use block bodies. Recent
  Chrome returns a Promise from `window.scrollTo`, which crashed the app when it
  was used as an expression-bodied effect.

## Adding a page
1. Create `features/<name>/<Name>Page.tsx` (or `pages/` for static pages).
2. Add a `<Route>` in `App.tsx`.
3. Add strings to `en.json` and `hi.json`.
4. Add a Playwright test in `e2e/tests/` if it's a user journey.
