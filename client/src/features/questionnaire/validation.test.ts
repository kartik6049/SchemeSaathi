import { describe, expect, it } from 'vitest';
import type { Question } from '../../lib/types';
import { canContinue, isAnswered, isVisible, sanitize, visibleSteps } from './validation';

const L = { en: '', hi: '' };
const age: Question = { key: 'age', type: 'number', label: L, required: true, min: 0, max: 120 };
const gender: Question = { key: 'gender', type: 'enum', label: L, required: false, options: [] };
const bpl: Question = { key: 'bplCard', type: 'boolean', label: L, required: false };

describe('questionnaire validation', () => {
  it('requires required answers to continue', () => {
    expect(canContinue([age, gender], {})).toBe(false);
    expect(canContinue([age, gender], { age: 30 })).toBe(true);
    expect(canContinue([gender], {})).toBe(true);
  });

  it('rejects out-of-range numbers', () => {
    expect(isAnswered(age, 130)).toBe(false);
    expect(isAnswered(age, 0)).toBe(true);
  });

  it('treats false as a real answer', () => {
    expect(isAnswered(bpl, false)).toBe(true);
  });

  it('sanitize keeps only valid known answers', () => {
    expect(sanitize({ age: 500, gender: 'female', junk: 'x', bplCard: false }, [age, gender, bpl])).toEqual({ gender: 'female', bplCard: false });
  });
});

describe('conditional questions (showIf)', () => {
  const pregnant: Question = {
    key: 'pregnantOrLactating', type: 'boolean', label: L, required: false,
    showIf: [{ field: 'gender', operator: '=', value: 'female' }, { field: 'age', operator: '>=', value: 15 }, { field: 'age', operator: '<=', value: 50 }],
  };
  const bocw: Question = { key: 'bocwRegistered', type: 'boolean', label: L, required: false, showIf: [{ field: 'occupation', operator: 'in', value: ['unorganised_worker'] }] };

  it('shows a question only when every condition holds', () => {
    expect(isVisible(pregnant, { gender: 'female', age: 30 })).toBe(true);
    expect(isVisible(pregnant, { gender: 'female', age: 60 })).toBe(false);
    expect(isVisible(pregnant, { gender: 'male', age: 30 })).toBe(false);
    expect(isVisible(pregnant, {})).toBe(false);
    expect(isVisible(bocw, { occupation: 'unorganised_worker' })).toBe(true);
    expect(isVisible(bocw, { occupation: 'farmer' })).toBe(false);
  });

  it('skips steps whose questions are all hidden', () => {
    const steps = [
      { step: 1, fields: [age] },
      { step: 2, fields: [bocw] },
      { step: 3, fields: [bpl] },
    ];
    expect(visibleSteps(steps, { occupation: 'farmer' }).map((s) => s.step)).toEqual([1, 3]);
    expect(visibleSteps(steps, { occupation: 'unorganised_worker' }).map((s) => s.step)).toEqual([1, 2, 3]);
  });

  it('never sends answers to hidden questions', () => {
    expect(sanitize({ gender: 'male', age: 30, pregnantOrLactating: true }, [age, pregnant])).toEqual({ age: 30 });
  });
});
