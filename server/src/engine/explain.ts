/**
 * Human-readable explanations (FR-08), e.g.
 *   "Age: 62 ≥ 60"            /  "उम्र: 62 ≥ 60"
 *   "Category: SC (one of SC, ST)"
 *   "Annual family income: ₹1 – 2.5 lakh ≤ ₹2.5 lakh"
 * Produced in both languages at once so the client can switch instantly.
 */
import type { Lang, Localized } from '../lib/i18n.js';
import { getField, type FieldDef } from './fields.js';
import type { Operator, Rule, RuleValue } from './types.js';

const SYMBOL: Record<Operator, string> = {
  '=': '=', '!=': '≠', '<': '<', '<=': '≤', '>': '>', '>=': '≥', in: '∈', not_in: '∉',
};

/** Indian digit grouping without Intl (toLocaleString is ~100x slower on the hot path): 56460 -> "56,460". */
function groupIndian(n: number): string {
  const s = String(Math.round(n));
  if (s.length <= 3) return s;
  const head = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${head},${s.slice(-3)}`;
}

/** 250000 -> "₹2.5 lakh", 15000 -> "₹15,000", 12500000 -> "₹1.25 crore". */
export function formatRupees(amount: number, lang: Lang): string {
  const trim = (n: number) => String(Number(n.toFixed(2)));
  if (amount >= 10_000_000) return `₹${trim(amount / 10_000_000)} ${lang === 'hi' ? 'करोड़' : 'crore'}`;
  if (amount >= 100_000) return `₹${trim(amount / 100_000)} ${lang === 'hi' ? 'लाख' : 'lakh'}`;
  return `₹${groupIndian(amount)}`;
}

function optionLabel(field: FieldDef | undefined, value: string, lang: Lang): string {
  return field?.options?.find((o) => o.value === value)?.label[lang] ?? value;
}

export function formatValue(field: FieldDef | undefined, value: RuleValue | undefined, lang: Lang): string {
  if (value === undefined) return '—';
  if (Array.isArray(value)) return value.map((v) => optionLabel(field, v, lang)).join(', ');
  if (typeof value === 'boolean') return value ? (lang === 'hi' ? 'हाँ' : 'Yes') : lang === 'hi' ? 'नहीं' : 'No';
  if (typeof value === 'number') return field?.unit === 'rupees' ? formatRupees(value, lang) : String(value);
  return optionLabel(field, value, lang);
}

function explainOne(rule: Rule, actual: RuleValue | undefined, lang: Lang): string {
  const field = getField(rule.field);
  const noun = field?.noun[lang] ?? rule.field;
  const shown = formatValue(field, actual, lang);
  const expected = formatValue(field, rule.value, lang);

  switch (rule.operator) {
    case '=':
      return `${noun}: ${shown}`;
    case 'in':
      return `${noun}: ${shown} (${lang === 'hi' ? 'इनमें से एक' : 'one of'} ${expected})`;
    case '!=':
    case 'not_in':
      return `${noun}: ${shown} (${lang === 'hi' ? 'शामिल नहीं' : 'not'} ${expected})`;
    default:
      return `${noun}: ${shown} ${SYMBOL[rule.operator]} ${expected}`;
  }
}

// Explanations depend only on (rule, answer); memoise them per rule object so
// repeated matches don't rebuild the same strings (hot path, NFR-01).
const explainCache = new WeakMap<Rule, Map<string, Localized>>();

/** Explanation for a satisfied rule. */
export function explainRule(rule: Rule, actual: RuleValue | undefined): Localized {
  let byValue = explainCache.get(rule);
  if (!byValue) explainCache.set(rule, (byValue = new Map()));
  const key = JSON.stringify(actual ?? null);
  let text = byValue.get(key);
  if (!text) {
    text = { en: explainOne(rule, actual, 'en'), hi: explainOne(rule, actual, 'hi') };
    byValue.set(key, text);
  }
  return text;
}

/** Explanation for a rule that a range answer can't settle (income band straddles limit). */
export function explainUncertain(rule: Rule, actual: RuleValue | undefined): Localized {
  const field = getField(rule.field);
  const build = (lang: Lang) => {
    const noun = field?.noun[lang] ?? rule.field;
    const limit = `${SYMBOL[rule.operator]} ${formatValue(field, rule.value, lang)}`;
    return lang === 'hi'
      ? `${noun}: ${formatValue(field, actual, lang)} — सीमा ${limit} है, सटीक राशि से पुष्टि करें`
      : `${noun}: ${formatValue(field, actual, lang)} — limit is ${limit}, confirm with your exact figure`;
  };
  return { en: build('en'), hi: build('hi') };
}

const LOWER = new Set<Operator>(['>', '>=']);
const UPPER = new Set<Operator>(['<', '<=']);

/**
 * Explains a list of satisfied rules, merging a lower + upper bound on the
 * same numeric field into one line: "Age: 62 (18–75)" instead of two lines.
 */
export function explainRules(rules: Rule[], actualOf: (field: string) => RuleValue | undefined): { field: string; text: Localized }[] {
  const out: { field: string; text: Localized }[] = [];
  const used = new Set<Rule>();
  for (const rule of rules) {
    if (used.has(rule)) continue;
    const field = getField(rule.field);
    const partner =
      field?.type === 'number' && (LOWER.has(rule.operator) || UPPER.has(rule.operator))
        ? rules.find((o) => o !== rule && !used.has(o) && o.field === rule.field && (LOWER.has(rule.operator) ? UPPER : LOWER).has(o.operator))
        : undefined;
    if (partner && field) {
      used.add(rule).add(partner);
      const [lo, hi] = LOWER.has(rule.operator) ? [rule, partner] : [partner, rule];
      const build = (lang: Lang) =>
        `${field.noun[lang]}: ${formatValue(field, actualOf(rule.field), lang)} (${formatValue(field, lo.value, lang)}–${formatValue(field, hi.value, lang)})`;
      out.push({ field: rule.field, text: { en: build('en'), hi: build('hi') } });
    } else {
      used.add(rule);
      out.push({ field: rule.field, text: explainRule(rule, actualOf(rule.field)) });
    }
  }
  return out;
}
