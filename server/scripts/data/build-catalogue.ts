/**
 * Step 2 of the data pipeline: builds the import-ready catalogue.
 *   in:  data/raw/jansahayak/schemes_full.json   (myScheme index, 4,651 records)
 *        data/raw/jansahayak/SNAPSHOT_DATE
 *        data/processed/details.json             (from extract-pdfs.ts)
 *        data/translations/hi.json               (Hindi dictionary, optional — see data:translate:*)
 *   out: data/processed/catalogue.json           (ImportedScheme[])
 *        data/processed/report.json              (counts + rule-signal histogram)
 *
 * Skips duplicates of the hand-curated seed schemes (curated versions win).
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { SCHEMES as CURATED } from '../../src/db/seed/schemes.data.js';
import { validateRules } from '../../src/engine/validate.js';
import { mapRecord, type ImportedScheme, type MySchemeRecord } from '../../src/importer/mapMyScheme.js';
import type { SchemeDetails } from '../../src/importer/pdfSections.js';
import { applyHindi, type HindiDictionary } from '../../src/importer/translations.js';

const DATA = path.resolve(import.meta.dirname, '../../../data');

/** myScheme slugs that are the same scheme as a curated seed entry. */
export const CURATED_ALIASES = new Set([
  'pm-kisan', 'apy', 'pmjjby', 'pmsby', 'pmuy', 'pmay-u', 'ab-pmjay', 'pmmy', 'sui', 'pmv', 'pmis', 'pmfby', 'kcc',
  'scss', 'ignwps', 'igndps', 'nmmss', 'post-dis', 'post-st', 'pre-sc', 'csss-cus', 'sak-deg', 'nsap-ignoaps', 'pm-sym',
  'pmkmdy', 'pm-gkay', 'sadppfaa', 'psgs-deg', 'psgs-dip', 'pmkvy-stt', 'mmlby', 'lbs-wb', 'bsccs',
]);

const words = (s: string) => new Set(s.toLowerCase().replace(/\(.*?\)/g, '').match(/[a-z]{3,}/g) ?? []);
function similarity(a: string, b: string) {
  const A = words(a), B = words(b);
  const inter = [...A].filter((w) => B.has(w)).length;
  return inter / Math.max(1, Math.min(A.size, B.size));
}

const raw = JSON.parse(await readFile(path.join(DATA, 'raw/jansahayak/schemes_full.json'), 'utf8')) as { fields: MySchemeRecord }[];
const details = JSON.parse(await readFile(path.join(DATA, 'processed/details.json'), 'utf8')) as Record<string, SchemeDetails>;
const hindi = JSON.parse(await readFile(path.join(DATA, 'translations/hi.json'), 'utf8').catch(() => '{}')) as HindiDictionary;
const snapshot = (await readFile(path.join(DATA, 'raw/jansahayak/SNAPSHOT_DATE'), 'utf8').catch(() => '2026-01-01')).trim();

const curatedSlugs = new Set(CURATED.map((s) => s.slug));
const out: ImportedScheme[] = [];
const seen = new Set<string>();
const skipped = { duplicateSlug: 0, curated: 0, invalidRules: 0, nearCurated: [] as string[] };
const signalCounts: Record<string, number> = {};

for (const { fields: rec } of raw) {
  if (!rec?.slug || !rec.schemeName || seen.has(rec.slug)) {
    skipped.duplicateSlug++;
    continue;
  }
  seen.add(rec.slug);
  if (curatedSlugs.has(rec.slug) || CURATED_ALIASES.has(rec.slug)) {
    skipped.curated++;
    continue;
  }
  // Flag (don't skip) near-duplicates of curated central schemes for manual review.
  if (rec.level === 'Central') {
    const near = CURATED.find((c) => !c.state && similarity(c.name.en, rec.schemeName) >= 0.8);
    if (near) skipped.nearCurated.push(`${rec.slug} ~ ${near.slug}`);
  }

  const mapped = mapRecord(rec, details[rec.slug], snapshot);
  const errors = validateRules(mapped.rules);
  if (errors.length) {
    // Drop only the invalid rules, keep the scheme.
    const bad = new Set(errors.map((e) => e.index));
    mapped.rules = mapped.rules.filter((_, i) => !bad.has(i));
    skipped.invalidRules++;
  }
  for (const s of mapped.signals) {
    const k = s.replace(/[<>=]+\d+$/, '');
    signalCounts[k] = (signalCounts[k] ?? 0) + 1;
  }
  out.push(applyHindi(mapped, hindi));
}

const report = {
  snapshot,
  total: out.length,
  withDetails: out.filter((s) => s.benefits.en).length,
  hindi: {
    complete: out.filter((s) => (['name', 'ministry', 'summary', 'benefits', 'eligibility', 'howToApply'] as const).every((f) => !s[f].en || s[f].hi)).length,
    nameOnly: out.filter((s) => s.name.hi && !s.summary.hi).length,
    none: out.filter((s) => !s.name.hi).length,
  },
  matchable: out.filter((s) => s.matchable).length,
  browseOnly: out.filter((s) => !s.matchable).length,
  organisation: out.filter((s) => s.audience === 'organisation').length,
  central: out.filter((s) => !s.state && !s.rules.some((r) => r.field === 'state')).length,
  inactiveExpired: out.filter((s) => !s.isActive).length,
  newDocuments: new Set(out.flatMap((s) => s.newDocuments.map(([c]) => c))).size,
  skipped,
  signals: Object.fromEntries(Object.entries(signalCounts).sort((a, b) => b[1] - a[1])),
};

await writeFile(path.join(DATA, 'processed/catalogue.json'), JSON.stringify(out));
await writeFile(path.join(DATA, 'processed/report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, skipped: { ...skipped, nearCurated: skipped.nearCurated.length }, signals: undefined }, null, 2));
console.log('near-curated (review):', skipped.nearCurated.slice(0, 30).join(' | '));
