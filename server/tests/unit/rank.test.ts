// UT-RANK-01: relevance score and ordering.
import { describe, expect, it } from 'vitest';
import { deadlineUrgency, rank, relevanceScore } from '../../src/engine/rank.js';
import type { SchemeEvaluation, SchemeForMatching } from '../../src/engine/types.js';

const today = new Date('2026-11-01T00:00:00Z');
const ev = (over: Partial<SchemeEvaluation> = {}): SchemeEvaluation => ({
  slug: 'x', status: 'eligible', matchRatio: 1, passedCount: 2, reasons: [], missingFields: [], uncertainReasons: [], ...over,
});
const sc = (over: Partial<SchemeForMatching> = {}): SchemeForMatching => ({ slug: 'x', state: null, benefitTier: 2, deadline: null, rules: [], ...over });

describe('deadlineUrgency()', () => {
  it('is highest within 30 days and zero after the deadline', () => {
    expect(deadlineUrgency('2026-11-20', today)).toBe(1);
    expect(deadlineUrgency('2026-10-01', today)).toBe(0);
    expect(deadlineUrgency(null, today)).toBe(0.3);
    expect(deadlineUrgency('2027-06-01', today)).toBeLessThan(1);
  });
});

describe('relevanceScore()', () => {
  it('rewards full matches, specificity, benefit size and close deadlines', () => {
    const base = relevanceScore(ev(), sc(), today);
    expect(relevanceScore(ev({ matchRatio: 0.5 }), sc(), today)).toBeLessThan(base);
    expect(relevanceScore(ev({ passedCount: 5 }), sc(), today)).toBeGreaterThan(base);
    expect(relevanceScore(ev(), sc({ benefitTier: 3 }), today)).toBeGreaterThan(base);
    expect(relevanceScore(ev(), sc({ deadline: '2026-11-15' }), today)).toBeGreaterThan(base);
  });

  it('stays within 0..1', () => {
    const max = relevanceScore(ev({ passedCount: 9 }), sc({ benefitTier: 3, deadline: '2026-11-05' }), today);
    expect(max).toBeLessThanOrEqual(1);
    expect(relevanceScore(ev({ matchRatio: 0, passedCount: 0 }), sc({ benefitTier: 1, deadline: '2020-01-01' }), today)).toBeGreaterThanOrEqual(0);
  });
});

describe('rank()', () => {
  it('sorts by score desc, then name', () => {
    const out = rank([{ item: 'b', score: 0.5 }, { item: 'a', score: 0.5 }, { item: 'c', score: 0.9 }], (s) => s);
    expect(out.map((o) => o.item)).toEqual(['c', 'a', 'b']);
  });
});
