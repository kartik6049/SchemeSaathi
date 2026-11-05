/**
 * Rule operators.
 *
 * `evaluateRule` decides a single rule against a profile and returns
 *   'pass'    — the condition holds
 *   'fail'    — the condition does not hold
 *   'unknown' — the user skipped the field, OR the answer is a range that
 *               straddles the rule's limit (e.g. income band ₹2.5–5 lakh vs
 *               rule "income ≤ ₹3 lakh").
 *
 * Range fields use interval logic: a comparison passes only if it holds for
 * BOTH ends of the band, fails if it holds for NEITHER, otherwise unknown.
 */
import { getField, rangeBounds } from './fields.js';
import type { Operator, Profile, Rule, RuleStatus, RuleValue } from './types.js';

const COMPARISONS = new Set<Operator>(['<', '<=', '>', '>=']);

export function isMissing(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

function compareNumbers(actual: number, op: Operator, expected: number): boolean {
  switch (op) {
    case '<': return actual < expected;
    case '<=': return actual <= expected;
    case '>': return actual > expected;
    case '>=': return actual >= expected;
    case '=': return actual === expected;
    case '!=': return actual !== expected;
    default: return false;
  }
}

/** Generic comparison for scalar values (strings, numbers, booleans). */
export function compare(actual: string | number | boolean, op: Operator, expected: RuleValue): boolean {
  switch (op) {
    case '=': return actual === expected;
    case '!=': return actual !== expected;
    case 'in': return Array.isArray(expected) && expected.includes(String(actual));
    case 'not_in': return Array.isArray(expected) && !expected.includes(String(actual));
    default:
      if (typeof actual !== 'number' || typeof expected !== 'number') return false;
      return compareNumbers(actual, op, expected);
  }
}

export function evaluateRule(rule: Rule, profile: Profile): RuleStatus {
  const actual = profile[rule.field];
  if (isMissing(actual)) return 'unknown';

  const field = getField(rule.field);
  if (field?.type === 'range' && COMPARISONS.has(rule.operator) && typeof rule.value === 'number') {
    const bounds = rangeBounds(field, String(actual));
    if (!bounds) return 'unknown';
    const lo = compareNumbers(bounds[0], rule.operator, rule.value);
    const hi = compareNumbers(bounds[1], rule.operator, rule.value);
    if (lo && hi) return 'pass';
    if (!lo && !hi) return 'fail';
    return 'unknown';
  }

  return compare(actual as string | number | boolean, rule.operator, rule.value) ? 'pass' : 'fail';
}
