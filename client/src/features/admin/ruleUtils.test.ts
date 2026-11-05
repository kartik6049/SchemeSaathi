import { describe, expect, it } from 'vitest';
import type { AdminField, Rule } from '../../lib/types';
import { compactGroups, defaultValue, groupWithIndex, nextGroupId } from './ruleUtils';

const r = (groupId: number, field = 'age'): Rule => ({ groupId, field, operator: '>=', value: 1 });
const L = { en: '', hi: '' };

describe('rule utils', () => {
  it('groups rules keeping their flat index', () => {
    const g = groupWithIndex([r(2), r(1), r(2)]);
    expect(g.map(([id, items]) => [id, items.map((i) => i.index)])).toEqual([[1, [1]], [2, [0, 2]]]);
  });

  it('computes the next group id and compacts gaps', () => {
    expect(nextGroupId([])).toBe(1);
    expect(nextGroupId([r(1), r(3)])).toBe(4);
    expect(compactGroups([r(1), r(3), r(3)]).map((x) => x.groupId)).toEqual([1, 2, 2]);
  });

  it('picks sensible default values per type/operator', () => {
    const bool: AdminField = { key: 'b', type: 'boolean', label: L };
    const en: AdminField = { key: 'e', type: 'enum', label: L, options: [{ value: 'x', label: L }] };
    const range: AdminField = { key: 'i', type: 'range', label: L, options: [{ value: 'below_1L', label: L }] };
    expect(defaultValue(bool, '=')).toBe(true);
    expect(defaultValue(en, 'in')).toEqual([]);
    expect(defaultValue(en, '=')).toBe('x');
    expect(defaultValue(range, '<=')).toBe(250000);
    expect(defaultValue(range, '=')).toBe('below_1L');
  });
});
