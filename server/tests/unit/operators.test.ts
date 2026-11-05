// UT-RULES-*: every operator, missing values, and range (interval) logic.
import { describe, expect, it } from 'vitest';
import { compare, evaluateRule } from '../../src/engine/operators.js';
import type { Rule } from '../../src/engine/types.js';

const rule = (field: string, operator: Rule['operator'], value: Rule['value']): Rule => ({ groupId: 1, field, operator, value });

describe('compare()', () => {
  it.each([
    [5, '=', 5, true], [5, '=', 6, false],
    [5, '!=', 6, true], [5, '!=', 5, false],
    [5, '<', 6, true], [6, '<', 6, false],
    [6, '<=', 6, true], [7, '<=', 6, false],
    [7, '>', 6, true], [6, '>', 6, false],
    [6, '>=', 6, true], [5, '>=', 6, false],
  ] as const)('%s %s %s -> %s', (a, op, b, expected) => {
    expect(compare(a, op, b)).toBe(expected);
  });

  it('handles in / not_in with string lists', () => {
    expect(compare('sc', 'in', ['sc', 'st'])).toBe(true);
    expect(compare('obc', 'in', ['sc', 'st'])).toBe(false);
    expect(compare('obc', 'not_in', ['sc', 'st'])).toBe(true);
    expect(compare('sc', 'not_in', ['sc', 'st'])).toBe(false);
  });

  it('compares booleans and strings strictly', () => {
    expect(compare(true, '=', true)).toBe(true);
    expect(compare(false, '=', true)).toBe(false);
    expect(compare('female', '=', 'female')).toBe(true);
  });

  it('returns false for numeric comparison on non-numbers', () => {
    expect(compare('10', '>', 5)).toBe(false);
  });
});

describe('evaluateRule()', () => {
  it('is unknown when the field was skipped', () => {
    expect(evaluateRule(rule('age', '>=', 60), {})).toBe('unknown');
    expect(evaluateRule(rule('bplCard', '=', true), { bplCard: undefined })).toBe('unknown');
  });

  it('passes and fails simple rules', () => {
    expect(evaluateRule(rule('age', '>=', 60), { age: 62 })).toBe('pass');
    expect(evaluateRule(rule('age', '>=', 60), { age: 59 })).toBe('fail');
    expect(evaluateRule(rule('occupation', '=', 'farmer'), { occupation: 'farmer' })).toBe('pass');
  });

  describe('range fields (income bands)', () => {
    it('passes when the whole band satisfies the limit', () => {
      // 1L_2_5L = [100001, 250000] is entirely <= 2.5 lakh
      expect(evaluateRule(rule('incomeRange', '<=', 250_000), { incomeRange: '1L_2_5L' })).toBe('pass');
      expect(evaluateRule(rule('incomeRange', '<=', 250_000), { incomeRange: 'below_1L' })).toBe('pass');
    });

    it('fails when no part of the band satisfies the limit', () => {
      expect(evaluateRule(rule('incomeRange', '<=', 250_000), { incomeRange: '5L_8L' })).toBe('fail');
    });

    it('is unknown when the band straddles the limit', () => {
      // 2_5L_5L = [250001, 500000] vs limit 3 lakh
      expect(evaluateRule(rule('incomeRange', '<=', 300_000), { incomeRange: '2_5L_5L' })).toBe('unknown');
    });

    it('supports lower-bound comparisons', () => {
      expect(evaluateRule(rule('incomeRange', '>', 800_000), { incomeRange: 'above_18L' })).toBe('pass');
      expect(evaluateRule(rule('incomeRange', '>', 800_000), { incomeRange: 'below_1L' })).toBe('fail');
    });

    it('supports equality on band keys', () => {
      expect(evaluateRule(rule('incomeRange', '=', 'below_1L'), { incomeRange: 'below_1L' })).toBe('pass');
      expect(evaluateRule(rule('incomeRange', 'in', ['5L_8L', '8L_18L']), { incomeRange: 'below_1L' })).toBe('fail');
    });

    it('is unknown for an unrecognised band', () => {
      expect(evaluateRule(rule('incomeRange', '<=', 250_000), { incomeRange: 'nonsense' })).toBe('unknown');
    });
  });
});
