/**
 * Pure helpers for the rule builder (unit-tested in ruleUtils.test.ts).
 * Rules are kept as one flat array (so server error indexes line up) and
 * grouped by `groupId` only for display.
 */
import type { AdminField, Operator, Rule, RuleValue } from '../../lib/types';

export const OPERATORS_BY_TYPE: Record<AdminField['type'], Operator[]> = {
  enum: ['=', '!=', 'in', 'not_in'],
  boolean: ['=', '!='],
  number: ['>=', '<=', '>', '<', '=', '!='],
  range: ['<=', '<', '>=', '>', '=', '!=', 'in', 'not_in'],
};

export const OPERATOR_LABEL: Record<Operator, string> = {
  '=': 'is (=)', '!=': 'is not (≠)', '<': '< less than', '<=': '≤ at most', '>': '> more than', '>=': '≥ at least', in: 'is one of', not_in: 'is none of',
};

export function defaultValue(field: AdminField | undefined, op: Operator): RuleValue {
  if (!field) return '';
  if (op === 'in' || op === 'not_in') return [];
  if (field.type === 'boolean') return true;
  if (field.type === 'number') return field.min ?? 0;
  if (field.type === 'range' && op !== '=' && op !== '!=') return 250000;
  return field.options?.[0]?.value ?? '';
}

/** Returns [groupId, [{rule, index}]] pairs in group order. */
export function groupWithIndex(rules: Rule[]): [number, { rule: Rule; index: number }[]][] {
  const map = new Map<number, { rule: Rule; index: number }[]>();
  rules.forEach((rule, index) => {
    if (!map.has(rule.groupId)) map.set(rule.groupId, []);
    map.get(rule.groupId)!.push({ rule, index });
  });
  return [...map.entries()].sort((a, b) => a[0] - b[0]);
}

export function nextGroupId(rules: Rule[]): number {
  return rules.reduce((m, r) => Math.max(m, r.groupId), 0) + 1;
}

/** Renumbers groups to 1..n after deletions, keeping order. */
export function compactGroups(rules: Rule[]): Rule[] {
  const ids = [...new Set(rules.map((r) => r.groupId))].sort((a, b) => a - b);
  return rules.map((r) => ({ ...r, groupId: ids.indexOf(r.groupId) + 1 }));
}
