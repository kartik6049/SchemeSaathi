// UT-VALID-01: rule validator used by the admin panel (FR-18).
import { describe, expect, it } from 'vitest';
import { validateRule, validateRules, valueTypeOf } from '../../src/engine/validate.js';

describe('validateRule()', () => {
  it('accepts valid rules for every field type', () => {
    expect(validateRule({ groupId: 1, field: 'age', operator: '>=', value: 60 })).toEqual([]);
    expect(validateRule({ groupId: 1, field: 'bplCard', operator: '=', value: true })).toEqual([]);
    expect(validateRule({ groupId: 1, field: 'category', operator: 'in', value: ['sc', 'st'] })).toEqual([]);
    expect(validateRule({ groupId: 2, field: 'incomeRange', operator: '<=', value: 250000 })).toEqual([]);
    expect(validateRule({ groupId: 1, field: 'incomeRange', operator: '=', value: 'below_1L' })).toEqual([]);
    expect(validateRule({ groupId: 1, field: 'state', operator: '=', value: 'UP' })).toEqual([]);
  });

  it.each([
    [{ groupId: 1, field: 'shoeSize', operator: '=', value: 9 }, 'Unknown field'],
    [{ groupId: 1, field: 'age', operator: 'like', value: 9 }, 'Unknown operator'],
    [{ groupId: 0, field: 'age', operator: '>=', value: 9 }, 'Group must be'],
    [{ groupId: 1, field: 'bplCard', operator: '>', value: true }, 'not allowed for boolean'],
    [{ groupId: 1, field: 'age', operator: '>=', value: '60' }, 'must be a number'],
    [{ groupId: 1, field: 'age', operator: '>=', value: 500 }, 'between 0 and 120'],
    [{ groupId: 1, field: 'bplCard', operator: '=', value: 'yes' }, 'true or false'],
    [{ groupId: 1, field: 'category', operator: '=', value: 'xyz' }, 'Invalid option'],
    [{ groupId: 1, field: 'category', operator: 'in', value: [] }, 'non-empty list'],
    [{ groupId: 1, field: 'category', operator: 'in', value: ['sc', 'bad'] }, 'Invalid option(s)'],
    [{ groupId: 1, field: 'incomeRange', operator: '<=', value: -5 }, 'non-negative'],
    [{ groupId: 1, field: 'incomeRange', operator: '=', value: 'lots' }, 'must be one of'],
    [{ groupId: 1, field: 'occupation', operator: '<', value: 'farmer' }, 'not allowed for enum'],
  ] as const)('rejects %j', (rule, message) => {
    const errors = validateRule(rule as never, 3);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].index).toBe(3);
    expect(errors[0].message).toContain(message);
  });
});

describe('validateRules()', () => {
  it('reports the index of each bad rule', () => {
    const errors = validateRules([
      { groupId: 1, field: 'age', operator: '>=', value: 60 },
      { groupId: 1, field: 'nope', operator: '=', value: 1 },
    ]);
    expect(errors).toEqual([{ index: 1, message: 'Unknown field "nope"' }]);
  });
});

describe('valueTypeOf()', () => {
  it('maps JS values to stored value types', () => {
    expect(valueTypeOf(['a'])).toBe('string[]');
    expect(valueTypeOf(1)).toBe('number');
    expect(valueTypeOf(true)).toBe('boolean');
    expect(valueTypeOf('x')).toBe('string');
  });
});
