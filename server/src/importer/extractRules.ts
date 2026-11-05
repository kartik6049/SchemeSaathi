/**
 * Heuristic eligibility-rule extraction for imported myScheme data.
 *
 * Input: the scheme's tags plus its eligibility text (or short description).
 * Output: rules in the engine's format, plus the list of signals that fired
 * (stored for admin review).
 *
 * Design principles:
 *  - Conservative: only emit a rule when a tag or an unambiguous phrase supports it.
 *    A missed rule makes a result "too broad" (the user still sees "likely");
 *    a wrong rule hides a scheme from someone eligible, which is worse.
 *  - Every emitted rule passes `validateRules` (checked by the caller).
 *  - All rules go in group 1 (AND). OR-structures can't be inferred reliably;
 *    admins can refine them later in the rule builder.
 */
import type { Rule, RuleValue } from '../engine/types.js';

export interface Extraction {
  rules: Rule[];
  signals: string[];
}

const POST_MATRIC = ['higher_secondary', 'diploma', 'graduate', 'postgraduate'];
const ENTERPRISE = ['self_employed', 'unemployed', 'artisan', 'street_vendor', 'homemaker', 'fisher'];

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Tag lists (normalised) that imply a condition. */
const TAG = {
  female: ['women', 'woman', 'girl', 'girls', 'female', 'widow', 'widows', 'mother', 'mothers', 'girl student', 'girl students', 'pregnant women', 'lactating mother', 'women empowerment', 'women entrepreneur'],
  transgender: ['transgender', 'transgenders', 'third gender'],
  widow: ['widow', 'widows', 'widow pension', 'destitute widow'],
  sc: ['scheduled caste', 'scheduled castes', 'sc', 'dalit'],
  st: ['scheduled tribe', 'scheduled tribes', 'st', 'tribal', 'tribe', 'tribals', 'adivasi'],
  obc: ['obc', 'other backward class', 'other backward classes', 'backward class', 'backward classes', 'obcs', 'ebc', 'mbc'],
  minority: ['minority', 'minorities', 'muslim', 'christian', 'sikh', 'buddhist', 'jain', 'parsi', 'minority community'],
  disability: ['disability', 'disabled', 'pwd', 'pwds', 'persons with disability', 'persons with disabilities', 'divyang', 'divyangjan', 'differently abled', 'handicapped', 'blind', 'deaf', 'visually impaired', 'hearing impaired', 'specially abled'],
  student: ['student', 'students', 'scholarship', 'scholarships', 'pre matric', 'post matric', 'school student', 'college student'],
  preMatric: ['pre matric'],
  postMatric: ['post matric'],
  senior: ['senior citizen', 'senior citizens', 'old age', 'elderly', 'old age pension', 'aged'],
  farmer: ['farmer', 'farmers', 'kisan', 'small farmer', 'marginal farmer', 'small and marginal farmers', 'cultivator'],
  fisher: ['fisherman', 'fishermen', 'fisher', 'fishers', 'fisherwomen', 'fisherfolk', 'fish farmer'],
  artisan: ['artisan', 'artisans', 'weaver', 'weavers', 'handloom', 'handicraft', 'handicrafts', 'craftsman', 'craftsmen', 'craftsperson', 'potter', 'carpenter'],
  streetVendor: ['street vendor', 'street vendors', 'hawker', 'hawkers'],
  sportsperson: ['sportsperson', 'sportspersons', 'sports person', 'athlete', 'athletes', 'player', 'players', 'sportsmen'],
  artist: ['artist', 'artists', 'artiste', 'artistes', 'folk artist', 'performing artist', 'musician', 'writer', 'writers', 'litterateur'],
  unemployed: ['unemployed', 'unemployment', 'unemployment allowance', 'job seeker', 'job seekers'],
  entrepreneur: ['entrepreneur', 'entrepreneurs', 'entrepreneurship', 'self employment', 'startup', 'start up', 'micro enterprise'],
  bpl: ['bpl', 'below poverty line', 'antyodaya', 'aay', 'poor family', 'poor families'],
  rural: ['rural', 'village', 'gram panchayat'],
  urban: ['urban', 'city'],
  exServiceman: ['ex servicemen', 'ex serviceman', 'ex servicemen welfare', 'veteran', 'veterans', 'armed forces', 'soldier', 'soldiers', 'defence personnel', 'war widow', 'esm'],
  bocw: ['construction worker', 'construction workers', 'building worker', 'building workers', 'bocw', 'building and other construction workers'],
  girlChild: ['girl child', 'daughter', 'daughters', 'kanya', 'beti'],
  pregnant: ['pregnant women', 'pregnant woman', 'pregnancy', 'maternity', 'lactating mother', 'lactating mothers', 'maternity benefit', 'delivery'],
};

const has = (tags: Set<string>, list: string[]) => list.some((t) => tags.has(t));

function lakhToRupees(num: string, unit?: string): number | null {
  const n = Number(num.replace(/,/g, ''));
  if (!Number.isFinite(n)) return null;
  const u = unit?.toLowerCase();
  if (u?.startsWith('lakh') || u?.startsWith('lac')) return Math.round(n * 100_000);
  if (u?.startsWith('crore')) return Math.round(n * 10_000_000);
  return Math.round(n);
}

const AMOUNT = String.raw`(?:₹|rs\.?|inr|rupees)?\s*([\d][\d,]*(?:\.\d+)?)\s*(lakhs?|lacs?|crores?)?`;
const LIMIT = String.raw`(?:should not exceed|shall not exceed|must not exceed|does not exceed|not exceed(?:ing)?|not be more than|not more than|not be above|less than|below|up to|upto|within|maximum of|limit of|ceiling of|not above)`;

/** Annual income ceiling in rupees, from phrases like "annual family income should not exceed ₹2,50,000". */
export function extractIncomeLimit(text: string): number | null {
  const t = text.toLowerCase();
  const annual = new RegExp(String.raw`(?:annual|yearly|family|household|parental|parents'?)\s+(?:family\s+)?income[^.]{0,60}?${LIMIT}[^.\d₹]{0,25}${AMOUNT}(?:\s*(?:per annum|p\.?a\.?|per year|annually|\/-))?`, 'i');
  const monthly = new RegExp(String.raw`(?:monthly)\s+(?:family\s+)?income[^.]{0,60}?${LIMIT}[^.\d₹]{0,25}${AMOUNT}`, 'i');
  const perMonth = new RegExp(String.raw`income[^.]{0,60}?${LIMIT}[^.\d₹]{0,25}${AMOUNT}\s*(?:\/-\s*)?(?:per month|a month|monthly)`, 'i');

  let m = t.match(monthly) ?? t.match(perMonth);
  if (m) {
    const v = lakhToRupees(m[1], m[2]);
    if (v && v >= 1_000 && v <= 500_000) return v * 12;
  }
  m = t.match(annual);
  if (m) {
    const v = lakhToRupees(m[1], m[2]);
    if (v && v >= 10_000 && v <= 5_000_000) return v;
  }
  return null;
}

/** Applicant age bounds, from phrases like "between 18 and 40 years", "60 years or above", "below 35 years". */
export function extractAgeRange(text: string): { min?: number; max?: number } {
  const t = text.toLowerCase().replace(/–|—/g, '-');
  // Ignore ages that refer to someone else (daughter, child, deceased…)
  const sentences = t.split(/(?<=[.;])\s*/).filter((s) => /\bage|aged|years old|years of age|years (?:or|and) (?:above|more|older)|\d\s*years? (?:or|and) (?:above|more)/.test(s) && !/(daughter|son|child|children|girl|boy|deceased|spouse|husband|wife|ward|marriage)/.test(s));
  const out: { min?: number; max?: number } = {};
  const ok = (n: number) => n >= 5 && n <= 100;
  for (const s of sentences) {
    let m = s.match(/between\s+(?:the\s+age(?:s)?\s+of\s+)?(\d{1,2})\s*(?:years?)?\s*(?:and|to|-)\s*(\d{1,3})\s*years/);
    if (!m) m = s.match(/(?:age|aged)[^.\d]{0,30}(\d{1,2})\s*(?:-|to)\s*(\d{1,3})\s*years/);
    if (m && ok(+m[1]) && ok(+m[2]) && +m[1] < +m[2]) {
      out.min ??= +m[1];
      out.max ??= +m[2];
      continue;
    }
    m = s.match(/(\d{1,2})\s*years?(?:\s+of\s+age)?\s*(?:or|and)\s*(?:above|more|older)/) ?? s.match(/(?:above|over|more than|at least|minimum(?:\s+age)?(?:\s+of)?|not less than|attained(?:\s+the\s+age\s+of)?)\s+(?:the\s+age\s+of\s+)?(\d{1,2})\s*years/);
    if (m && ok(+m[1])) out.min ??= +m[1];
    m = s.match(/(?:below|under|less than|not more than|not exceed(?:ing)?|maximum(?:\s+age)?(?:\s+of)?|up ?to|upper age limit(?:\s+is)?(?:\s+of)?)\s+(?:the\s+age\s+of\s+)?(\d{1,3})\s*years/);
    if (m && ok(+m[1])) out.max ??= +m[1];
  }
  if (out.min !== undefined && out.max !== undefined && out.min >= out.max) return {};
  return out;
}

export function extractRules(tagsIn: string[], text: string): Extraction {
  const tags = new Set(tagsIn.map(norm));
  const lower = text.toLowerCase();
  const rules: Rule[] = [];
  const signals: string[] = [];
  const add = (field: string, operator: Rule['operator'], value: RuleValue, why: string) => {
    if (rules.some((r) => r.field === field && r.operator === operator)) return;
    rules.push({ groupId: 1, field, operator, value });
    signals.push(why);
  };

  // ── Gender & family situation ──
  const pregnant = has(tags, TAG.pregnant) || /\b(pregnant women|lactating mothers?)\b/.test(lower);
  if (has(tags, TAG.transgender)) add('gender', '=', 'transgender', 'tag:transgender');
  else if (has(tags, TAG.female) || pregnant || /\b(only (?:for )?women|women applicants?|female applicants?|applicant (?:should|must) be a (?:woman|female|girl))\b/.test(lower))
    add('gender', '=', 'female', 'tag/text:female');
  if (pregnant) add('pregnantOrLactating', '=', true, 'tag/text:pregnant');
  if (has(tags, TAG.widow) || /\bapplicant (?:should|must) be a widow\b/.test(lower)) add('maritalStatus', '=', 'widowed', 'tag/text:widow');
  if (has(tags, TAG.girlChild) && !rules.some((r) => r.field === 'gender' && r.value === 'female' && has(tags, ['girl student', 'girl students'])))
    add('hasGirlChild', '=', true, 'tag:girl-child');

  // ── Social category ──
  const cats: string[] = [];
  if (has(tags, TAG.sc) || /\bbelong(?:s|ing)? to (?:the )?scheduled castes?\b/.test(lower)) cats.push('sc');
  if (has(tags, TAG.st) || /\bbelong(?:s|ing)? to (?:the )?scheduled tribes?\b/.test(lower)) cats.push('st');
  if (has(tags, TAG.obc) || /\bbelong(?:s|ing)? to (?:the )?(?:other )?backward class(?:es)?\b/.test(lower)) cats.push('obc');
  if (cats.length === 1) add('category', '=', cats[0], `tag/text:${cats[0]}`);
  else if (cats.length > 1) add('category', 'in', cats, `tag/text:${cats.join('+')}`);
  if (has(tags, TAG.minority) || /\bbelong(?:s|ing)? to (?:a |the )?(?:notified )?minority communit/.test(lower)) add('minority', '=', true, 'tag/text:minority');

  // ── Disability ──
  if (has(tags, TAG.disability) || /\b(person|persons|applicant|student)s? with (?:benchmark )?disabilit/.test(lower) || /\b40\s*%\s*(?:or more )?disabilit/.test(lower))
    add('disability', '=', true, 'tag/text:disability');

  // ── Education ──
  if (has(tags, TAG.student)) add('student', '=', true, 'tag:student');
  if (has(tags, TAG.preMatric)) add('educationLevel', 'in', ['primary', 'secondary'], 'tag:pre-matric');
  else if (has(tags, TAG.postMatric)) add('educationLevel', 'in', POST_MATRIC, 'tag:post-matric');

  // ── Occupation (first match wins; most specific first) ──
  const occ: [string[], RuleValue, string][] = [
    [TAG.fisher, 'fisher', 'tag:fisher'],
    [TAG.streetVendor, 'street_vendor', 'tag:street-vendor'],
    [TAG.artisan, 'artisan', 'tag:artisan'],
    [TAG.farmer, 'farmer', 'tag:farmer'],
    [TAG.sportsperson, 'sportsperson', 'tag:sportsperson'],
    [TAG.artist, 'artist', 'tag:artist'],
  ];
  const hit = occ.find(([list]) => has(tags, list));
  if (hit) add('occupation', '=', hit[1], hit[2]);
  else if (has(tags, TAG.unemployed)) add('occupation', 'in', ['unemployed', 'student'], 'tag:unemployed');
  // A student can't also have an "entrepreneur" occupation; student schemes for future founders keep only `student`.
  else if (has(tags, TAG.entrepreneur) && !rules.some((r) => r.field === 'student')) add('occupation', 'in', ENTERPRISE, 'tag:entrepreneur');

  if (has(tags, TAG.bocw) || /\bregistered (?:construction|building) workers?\b/.test(lower)) add('bocwRegistered', '=', true, 'tag/text:bocw');
  if (has(tags, TAG.exServiceman) || /\bex-?servicem[ae]n\b/.test(lower)) add('exServiceman', '=', true, 'tag/text:ex-serviceman');

  // ── Poverty / area ──
  if (has(tags, TAG.bpl) || /\b(?:belong(?:s|ing)? to|from) (?:a |the )?(?:bpl|below poverty line)\b/.test(lower)) add('bplCard', '=', true, 'tag/text:bpl');
  if (has(tags, TAG.rural) && !has(tags, TAG.urban)) add('area', '=', 'rural', 'tag:rural');
  else if (has(tags, TAG.urban) && !has(tags, TAG.rural)) add('area', '=', 'urban', 'tag:urban');
  if (/\bshould not be an? income[- ]?tax payer|not (?:be )?(?:an? )?income[- ]?tax ?payers?\b|no member of the family (?:is|should be) an income[- ]?tax payer/.test(lower))
    add('incomeTaxPayer', '=', false, 'text:not-taxpayer');

  // ── Numbers from text ──
  const age = extractAgeRange(text);
  if (age.min !== undefined) add('age', '>=', age.min, `text:age>=${age.min}`);
  if (age.max !== undefined) add('age', '<=', age.max, `text:age<=${age.max}`);
  if (age.min === undefined && has(tags, TAG.senior)) add('age', '>=', 60, 'tag:senior');

  const income = extractIncomeLimit(text);
  if (income !== null) add('incomeRange', '<=', income, `text:income<=${income}`);

  return { rules: splitIdentityGroups(rules), signals };
}

/**
 * Tags list *who can benefit*, often as alternatives ("girls, SC/ST boys and
 * BPL children"). When two or more identity conditions came from tags, AND-ing
 * them would wrongly exclude most beneficiaries, so each identity becomes its
 * own OR group sharing the remaining (common) conditions.
 */
const IDENTITY_FIELDS = new Set(['gender', 'category', 'bplCard', 'disability', 'minority']);

export function splitIdentityGroups(rules: Rule[]): Rule[] {
  const identity = rules.filter((r) => IDENTITY_FIELDS.has(r.field));
  if (identity.length < 2) return rules;
  // Pregnancy/widowhood imply female; keep gender with them rather than splitting it off.
  const impliesFemale = rules.some((r) => r.field === 'pregnantOrLactating' || r.field === 'maritalStatus');
  const splittable = identity.filter((r) => !(r.field === 'gender' && impliesFemale));
  if (splittable.length < 2) return rules;
  const common = rules.filter((r) => !splittable.includes(r));
  return splittable.flatMap((id, i) => [...common, id].map((r) => ({ ...r, groupId: i + 1 })));
}
