// UT-RULES-*: AND/OR groups, implicit state rule, statuses and explanations.
import { describe, expect, it } from 'vitest';
import { evaluateScheme, groupRules } from '../../src/engine/evaluate.js';
import type { Rule, SchemeForMatching } from '../../src/engine/types.js';

const r = (field: string, operator: Rule['operator'], value: Rule['value'], groupId = 1): Rule => ({ groupId, field, operator, value });
const scheme = (rules: Rule[], state: string | null = null): SchemeForMatching => ({ slug: 'test', state, benefitTier: 2, deadline: null, rules });

describe('groupRules()', () => {
  it('groups by groupId in order', () => {
    const groups = groupRules(scheme([r('age', '>=', 60, 2), r('bplCard', '=', true, 1)]));
    expect(groups.map((g) => g[0].field)).toEqual(['bplCard', 'age']);
  });

  it('adds an implicit state rule to every group of a state scheme', () => {
    const groups = groupRules(scheme([r('age', '>=', 60, 1), r('age', '>=', 70, 2)], 'UP'));
    expect(groups).toHaveLength(2);
    for (const g of groups) expect(g[0]).toMatchObject({ field: 'state', operator: '=', value: 'UP' });
  });

  it('creates a state-only group for a state scheme with no rules', () => {
    expect(groupRules(scheme([], 'MH'))).toEqual([[{ groupId: 1, field: 'state', operator: '=', value: 'MH' }]]);
  });
});

describe('evaluateScheme()', () => {
  const oldAge = scheme([r('age', '>=', 60), r('bplCard', '=', true)]);

  it('is eligible when all rules in a group pass (AND)', () => {
    const ev = evaluateScheme(oldAge, { age: 65, bplCard: true });
    expect(ev.status).toBe('eligible');
    expect(ev.matchRatio).toBe(1);
    expect(ev.reasons.map((x) => x.text.en)).toEqual(['Age: 65 ≥ 60', 'BPL / priority ration card: Yes']);
  });

  it('is ineligible when any rule in the only group fails', () => {
    expect(evaluateScheme(oldAge, { age: 65, bplCard: false }).status).toBe('ineligible');
  });

  it('is possible when nothing fails but a field was skipped', () => {
    const ev = evaluateScheme(oldAge, { age: 65 });
    expect(ev.status).toBe('possible');
    expect(ev.missingFields).toEqual(['bplCard']);
    expect(ev.matchRatio).toBe(0.5);
  });

  it('is eligible if ANY group passes (OR)', () => {
    const pmjay = scheme([r('bplCard', '=', true, 1), r('age', '>=', 70, 2)]);
    expect(evaluateScheme(pmjay, { bplCard: false, age: 72 }).status).toBe('eligible');
    expect(evaluateScheme(pmjay, { bplCard: true, age: 30 }).status).toBe('eligible');
    expect(evaluateScheme(pmjay, { bplCard: false, age: 30 }).status).toBe('ineligible');
  });

  it('collects missing fields across all open groups', () => {
    const s = scheme([r('bplCard', '=', true, 1), r('age', '>=', 70, 2)]);
    expect(evaluateScheme(s, {}).missingFields.sort()).toEqual(['age', 'bplCard']);
  });

  it('applies the state restriction', () => {
    const up = scheme([r('age', '>=', 60)], 'UP');
    expect(evaluateScheme(up, { state: 'UP', age: 61 }).status).toBe('eligible');
    expect(evaluateScheme(up, { state: 'BR', age: 61 }).status).toBe('ineligible');
    expect(evaluateScheme(up, { age: 61 }).missingFields).toEqual(['state']);
  });

  it('treats a scheme without rules as open to everyone', () => {
    expect(evaluateScheme(scheme([]), {}).status).toBe('eligible');
  });

  it('reports range answers that straddle a limit as uncertain, not missing', () => {
    const ev = evaluateScheme(scheme([r('incomeRange', '<=', 300_000)]), { incomeRange: '2_5L_5L' });
    expect(ev.status).toBe('possible');
    expect(ev.missingFields).toEqual([]);
    expect(ev.uncertainReasons[0].text.en).toContain('limit is ≤ ₹3 lakh');
  });

  it('merges lower and upper bounds into one readable reason', () => {
    const ev = evaluateScheme(scheme([r('age', '>=', 18), r('age', '<=', 40)]), { age: 30 });
    expect(ev.reasons).toEqual([{ field: 'age', text: { en: 'Age: 30 (18–40)', hi: 'उम्र: 30 (18–40)' } }]);
  });

  it('explains in/not_in rules with option labels in both languages', () => {
    const ev = evaluateScheme(scheme([r('category', 'in', ['sc', 'st'])]), { category: 'sc' });
    expect(ev.reasons[0].text.en).toBe('Category: Scheduled Caste (SC) (one of Scheduled Caste (SC), Scheduled Tribe (ST))');
    expect(ev.reasons[0].text.hi).toContain('इनमें से एक');
  });

  it('picks the group with most passed rules for explanation', () => {
    const s = scheme([r('age', '>=', 18, 1), r('age', '>=', 18, 2), r('gender', '=', 'female', 2)]);
    expect(evaluateScheme(s, { age: 30, gender: 'female' }).passedCount).toBe(2);
  });
});
