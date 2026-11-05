/**
 * Maps one myScheme index record (+ optional PDF details) to the app's
 * SchemeInput, plus import metadata. Pure function — unit-tested.
 *
 * Hindi is left empty here and filled from the translation dictionary by
 * build-catalogue (see translations.ts); anything still missing falls back to
 * English in the UI with a "Hindi translation pending" note.
 */
import { STATES } from '../engine/states.js';
import type { Rule } from '../engine/types.js';
import type { SchemeInput } from '../modules/schemes/schemes.types.js';
import { extractRules } from './extractRules.js';
import type { SchemeDetails } from './pdfSections.js';

export interface MySchemeRecord {
  slug: string;
  schemeName: string;
  schemeShortTitle?: string;
  level: 'Central' | 'State' | string;
  schemeFor?: string | null;
  nodalMinistryName?: string | null;
  schemeCategory?: string[];
  beneficiaryState?: string[];
  schemeCloseDate?: string | null;
  briefDescription?: string;
  tags?: string[] | null;
}

export type Audience = 'individual' | 'family' | 'organisation';

export interface ImportedScheme extends SchemeInput {
  source: 'myscheme';
  audience: Audience;
  matchable: boolean;
  needsReview: true;
  keywords: string;
  sourceUrl: string;
  /** Free-text documents that didn't map to a known code: [code, English name, Hindi name?]. */
  newDocuments: [string, string, string?][];
  signals: string[];
}

const STATE_ALIASES: Record<string, string> = {
  'andaman and nicobar islands': 'AN',
  'jammu and kashmir': 'JK',
  'dadra & nagar haveli and daman & diu': 'DH',
  'dadra and nagar haveli and daman and diu': 'DH',
  delhi: 'DL',
};
const STATE_BY_NAME = new Map(STATES.map((s) => [s.name.en.toLowerCase().replace(/&/g, 'and'), s.code]));

export function stateCode(name: string): string | undefined {
  const k = name.trim().toLowerCase();
  return STATE_ALIASES[k] ?? STATE_BY_NAME.get(k.replace(/&/g, 'and'));
}

const CATEGORY_MAP: Record<string, string> = {
  'social welfare & empowerment': 'social_welfare',
  'education & learning': 'education',
  'agriculture,rural & environment': 'agriculture',
  'business & entrepreneurship': 'business',
  'women and child': 'women_child',
  'skills & employment': 'employment',
  'banking,financial services and insurance': 'finance',
  'health & wellness': 'health',
  'sports & culture': 'sports_culture',
  'housing & shelter': 'housing',
  'science, it & communications': 'science_it',
  'transport & infrastructure': 'transport',
  'travel & tourism': 'tourism',
  'utility & sanitation': 'utility',
  'public safety,law & justice': 'justice',
};

export function mapCategory(categories: string[], tags: string[]): string {
  const t = tags.map((x) => x.toLowerCase());
  if (t.some((x) => x.includes('pension'))) return 'pension';
  if (t.some((x) => x.includes('insurance'))) return 'insurance';
  if (t.some((x) => /scholarship|fellowship/.test(x))) return 'education';
  for (const c of categories) {
    const m = CATEGORY_MAP[c.trim().toLowerCase()];
    if (m) return m;
  }
  return 'social_welfare';
}

const BENEFICIARY_FROM_RULE: [(r: Rule) => boolean, string][] = [
  [(r) => r.field === 'occupation' && r.value === 'farmer', 'farmer'],
  [(r) => r.field === 'student', 'student'],
  [(r) => r.field === 'gender' && r.value === 'female', 'women'],
  [(r) => r.field === 'age' && r.operator === '>=' && (r.value as number) >= 58, 'senior_citizen'],
  [(r) => r.field === 'disability', 'disabled'],
  [(r) => r.field === 'bocwRegistered' || (r.field === 'occupation' && ['unorganised_worker', 'street_vendor', 'artisan', 'fisher'].some((o) => JSON.stringify(r.value).includes(o))), 'worker'],
  [(r) => r.field === 'occupation' && JSON.stringify(r.value).includes('self_employed'), 'entrepreneur'],
  [(r) => r.field === 'category' && /sc|st/.test(JSON.stringify(r.value)), 'sc_st'],
  [(r) => r.field === 'category' && JSON.stringify(r.value).includes('obc'), 'obc'],
  [(r) => r.field === 'minority', 'minority'],
  [(r) => r.field === 'bplCard', 'bpl'],
  [(r) => r.field === 'age' && r.operator === '<=' && (r.value as number) <= 35, 'youth'],
];

/** Known document codes (seeded in documents.data.ts) recognised by keyword. */
const DOC_PATTERNS: [RegExp, string][] = [
  [/aadh?a?a?r/i, 'aadhaar'],
  [/bank|passbook|cancell?ed cheque/i, 'bank_passbook'],
  [/photo/i, 'photo'],
  [/income certificate|income proof|proof of income/i, 'income_cert'],
  [/caste|community certificate|tribe certificate/i, 'caste_cert'],
  [/disabilit|udid|handicap|divyang/i, 'disability_cert'],
  [/ration card|bpl card|bpl certificate/i, 'ration_card'],
  [/birth certificate|age proof|proof of age|date of birth/i, 'age_proof'],
  [/domicile|residen(ce|tial) (certificate|proof)|proof of residence/i, 'domicile_cert'],
  [/land record|khasra|khatauni|land ownership|patta|7\/12/i, 'land_records'],
  [/mark ?sheet|marks? card|mark list/i, 'marksheet'],
  [/admission|bonafide|bona fide|enrol?ment certificate/i, 'admission_proof'],
  [/fee receipt|fee structure/i, 'fee_receipt'],
  [/death certificate of (?:the )?(?:husband|spouse)/i, 'death_cert_spouse'],
  [/project report|business plan/i, 'business_plan'],
  [/mobile number/i, 'mobile'],
];

export function mapDocument(name: string): { code: string; isNew: boolean } {
  for (const [re, code] of DOC_PATTERNS) if (re.test(name)) return { code, isNew: false };
  const code = `x-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)}`;
  return { code, isNew: true };
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export function mapRecord(rec: MySchemeRecord, details: SchemeDetails | undefined, snapshotDate: string): ImportedScheme {
  const tags = (rec.tags ?? []).filter(Boolean);
  const states = (rec.beneficiaryState ?? []).filter((s) => s && s !== 'All');
  const codes = states.map(stateCode).filter((c): c is string => Boolean(c));

  const eligibilityText = details?.eligibility.join(' ') ?? '';
  const { rules, signals } = extractRules(tags, `${rec.briefDescription ?? ''}. ${eligibilityText}`);

  // One state -> scheme.state (engine adds the implicit rule); several -> explicit `state in [...]` rule.
  let state: string | null = null;
  if (codes.length === 1) state = codes[0];
  else if (codes.length > 1) rules.unshift({ groupId: 1, field: 'state', operator: 'in', value: codes });

  const audience: Audience = rec.schemeFor === 'Infra' ? 'organisation' : rec.schemeFor === 'Family' ? 'family' : 'individual';
  const personalRules = rules.filter((r) => r.field !== 'state');
  // Only auto-match when at least one *specific* personal condition was found. Generic
  // conditions alone (an age band, area, income) would match most adults, so such schemes
  // are browse/search only. A senior age bound counts as specific (pensions).
  const GENERIC = new Set(['age', 'area', 'incomeRange', 'incomeTaxPayer']);
  const specific = personalRules.some((r) => !GENERIC.has(r.field) || (r.field === 'age' && r.operator === '>=' && (r.value as number) >= 55));
  const matchable = audience !== 'organisation' && specific;

  const documents: string[] = [];
  const newDocuments: ImportedScheme['newDocuments'] = [];
  for (const d of details?.documents ?? []) {
    if (/^(indicative documents|documents? required|mandatory|optional)$/i.test(d)) continue;
    const { code, isNew } = mapDocument(d);
    if (!documents.includes(code)) documents.push(code);
    if (isNew && !newDocuments.some(([c]) => c === code)) newDocuments.push([code, clip(d, 140)]);
  }

  const beneficiaryTypes = [...new Set(BENEFICIARY_FROM_RULE.filter(([f]) => personalRules.some(f)).map(([, b]) => b))];
  const stateName = states.length === 1 ? states[0] : null;
  const ministry =
    rec.nodalMinistryName?.trim() ||
    details?.department ||
    (stateName ? `Government of ${stateName}` : 'Government of India');

  const tagLower = tags.map((t) => t.toLowerCase());
  const benefitTier = tagLower.some((t) => /award|certificate|training|felicitation/.test(t))
    ? 1
    : tagLower.some((t) => /housing|loan|insurance|pension|health insurance/.test(t))
      ? 3
      : 2;

  const deadline = rec.schemeCloseDate && /^\d{4}-\d{2}-\d{2}$/.test(rec.schemeCloseDate) ? rec.schemeCloseDate : null;
  const pageUrl = `https://www.myscheme.gov.in/schemes/${rec.slug}`;
  const summary = clip((rec.briefDescription ?? rec.schemeName).trim(), 300);

  return {
    slug: rec.slug,
    name: { en: clip(rec.schemeName.trim(), 200), hi: '' },
    ministry: { en: clip(ministry, 200), hi: '' },
    state,
    category: mapCategory(rec.schemeCategory ?? [], tags),
    beneficiaryTypes: beneficiaryTypes.length ? beneficiaryTypes : ['all'],
    summary: { en: summary, hi: '' },
    benefits: { en: clip(details?.benefits ?? '', 6000), hi: '' },
    eligibility: { en: clip(details?.eligibility.map((e) => `• ${e}`).join('\n') ?? '', 6000), hi: '' },
    howToApply: { en: clip(details?.applicationProcess ?? '', 6000), hi: '' },
    officialUrl: pageUrl,
    benefitTier,
    deadline,
    lastVerifiedAt: snapshotDate,
    isActive: !deadline || deadline >= new Date().toISOString().slice(0, 10),
    rules,
    documents,
    source: 'myscheme',
    audience,
    matchable,
    needsReview: true,
    keywords: [rec.schemeShortTitle ?? '', ...tags].join(' '),
    sourceUrl: pageUrl,
    newDocuments,
    signals,
  };
}
