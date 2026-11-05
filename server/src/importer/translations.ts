/**
 * Hindi for imported schemes. Translations live in a dictionary keyed by the
 * exact English text (data/translations/hi.json), so they survive rebuilds and
 * are reused for repeated strings (ministries, document names). When the
 * English source changes, its key no longer matches and the string shows up
 * again in `npm run data:translate:export`.
 *
 * Pure functions — unit-tested.
 */
import type { ImportedScheme } from './mapMyScheme.js';

export type HindiDictionary = Record<string, string>;

const TEXT_FIELDS = ['name', 'ministry', 'summary', 'benefits', 'eligibility', 'howToApply'] as const;

/** Every English string of a scheme that needs Hindi, short fields first. */
export function translatableStrings(s: ImportedScheme): string[] {
  const out = TEXT_FIELDS.map((f) => s[f].en).filter(Boolean);
  for (const [, en] of s.newDocuments) out.push(en);
  return out;
}

const DEVANAGARI = /[ऀ-ॿ]/;

const lines = (s: string) => s.trim().split('\n').length;

/** Rejects empty, non-Hindi, truncated or re-flowed translations. Returns a reason, or null if OK. */
export function checkTranslation(en: string, hi: unknown): string | null {
  if (typeof hi !== 'string' || !hi.trim()) return 'empty';
  if (!DEVANAGARI.test(hi) && /[a-z]{3,}/.test(en)) return 'no Devanagari';
  if (en.length > 200 && hi.length < en.length * 0.4) return 'too short (truncated?)';
  // GUIDE.md: one line in → one line out (bullets and numbered steps are rendered per line).
  if (lines(en) !== lines(hi)) return 'line count differs';
  return null;
}

/** Fills empty `hi` fields (and new document names) from the dictionary. Existing Hindi is kept. */
export function applyHindi(s: ImportedScheme, dict: HindiDictionary): ImportedScheme {
  const out = { ...s };
  for (const f of TEXT_FIELDS) {
    const hi = s[f].hi || dict[s[f].en] || '';
    out[f] = { en: s[f].en, hi };
  }
  out.newDocuments = s.newDocuments.map(([code, en, hi]) => [code, en, hi || dict[en] || '']);
  return out;
}
