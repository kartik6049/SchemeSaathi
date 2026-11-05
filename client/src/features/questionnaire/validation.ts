/**
 * Pure questionnaire helpers (unit-tested): visibility (`showIf`), step
 * navigation over visible steps, and validation / sanitising of answers.
 * Visibility mirrors `isFieldVisible` in server/src/engine/fields.ts.
 */
import type { Profile, Question, QuestionStep } from '../../lib/types';

export function isVisible(q: Question, answers: Profile): boolean {
  return (q.showIf ?? []).every((c) => {
    const v = answers[c.field];
    if (v === undefined || v === '') return false;
    switch (c.operator) {
      case '=': return v === c.value;
      case 'in': return Array.isArray(c.value) && c.value.includes(String(v));
      case '>=': return typeof v === 'number' && v >= (c.value as number);
      case '<=': return typeof v === 'number' && v <= (c.value as number);
    }
  });
}

export function visibleFields(step: QuestionStep, answers: Profile): Question[] {
  return step.fields.filter((f) => isVisible(f, answers));
}

/** Steps that currently have at least one visible question. */
export function visibleSteps(steps: QuestionStep[], answers: Profile): QuestionStep[] {
  return steps.filter((s) => visibleFields(s, answers).length > 0);
}

export function isAnswered(q: Question, value: Profile[string]): boolean {
  if (value === undefined || value === '') return false;
  if (q.type === 'number') return typeof value === 'number' && value >= (q.min ?? 0) && value <= (q.max ?? Infinity);
  return true;
}

/** A step can continue when every visible required question has a valid answer. */
export function canContinue(fields: Question[], answers: Profile): boolean {
  return fields.every((q) => !q.required || isAnswered(q, answers[q.key]));
}

/** Keeps only valid answers to questions that are visible — hidden answers are never sent. */
export function sanitize(answers: Profile, questions: Question[]): Profile {
  const out: Profile = {};
  for (const q of questions) {
    const v = answers[q.key];
    if (isVisible(q, answers) && isAnswered(q, v)) out[q.key] = v;
  }
  return out;
}
