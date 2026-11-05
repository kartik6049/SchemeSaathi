/**
 * Ranking (FR-07).
 *
 * relevance = 0.60 × matchRatio          (how fully the user matches)
 *           + 0.15 × specificity         (more satisfied rules = more targeted scheme)
 *           + 0.15 × benefit weight      (tier 3 high / 2 medium / 1 low)
 *           + 0.10 × deadline urgency    (closer deadline ranks higher)
 *
 * Scores are in 0..1 and rounded to 2 decimals.
 */
import type { SchemeEvaluation, SchemeForMatching } from './types.js';

const BENEFIT_WEIGHT: Record<number, number> = { 1: 0.3, 2: 0.6, 3: 1 };
const DAY_MS = 86_400_000;

export function deadlineUrgency(deadline: string | null, today: Date): number {
  if (!deadline) return 0.3; // open-ended / rolling schemes
  const days = (Date.parse(deadline) - today.getTime()) / DAY_MS;
  if (days < 0) return 0; // already passed
  if (days <= 30) return 1;
  return Math.max(0.3, 1 - (days - 30) / 335);
}

export function relevanceScore(ev: SchemeEvaluation, scheme: SchemeForMatching, today = new Date()): number {
  const specificity = Math.min(ev.passedCount, 5) / 5;
  const score =
    0.6 * ev.matchRatio +
    0.15 * specificity +
    0.15 * (BENEFIT_WEIGHT[scheme.benefitTier] ?? 0.6) +
    0.1 * deadlineUrgency(scheme.deadline, today);
  return Math.round(score * 100) / 100;
}

export interface Ranked<T> {
  item: T;
  score: number;
}

/** Sorts by score desc; ties broken by the provided name so order is stable. */
export function rank<T>(items: Ranked<T>[], nameOf: (item: T) => string): Ranked<T>[] {
  return [...items].sort((a, b) => b.score - a.score || nameOf(a.item).localeCompare(nameOf(b.item)));
}
