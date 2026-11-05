/**
 * Core types shared by the rules engine.
 *
 * A Profile is the questionnaire answers (never persisted, NFR-07).
 * A Rule is one machine-readable condition, e.g. { field: 'age', operator: '>=', value: 60 }.
 * Rules with the same `groupId` are AND-ed; groups are OR-ed.
 */
import type { Localized } from '../lib/i18n.js';

export const OPERATORS = ['=', '!=', '<', '<=', '>', '>=', 'in', 'not_in'] as const;
export type Operator = (typeof OPERATORS)[number];

export type ValueType = 'string' | 'number' | 'boolean' | 'string[]';
export type RuleValue = string | number | boolean | string[];

export interface Rule {
  groupId: number;
  field: string;
  operator: Operator;
  value: RuleValue;
}

/** Answers keyed by field key. Missing / undefined = skipped (unknown). */
export type Profile = Record<string, string | number | boolean | undefined>;

export type RuleStatus = 'pass' | 'fail' | 'unknown';

export interface RuleOutcome {
  rule: Rule;
  status: RuleStatus;
}

export type EligibilityStatus = 'eligible' | 'possible' | 'ineligible';

export interface SchemeForMatching {
  slug: string;
  state: string | null;
  benefitTier: number;
  deadline: string | null;
  rules: Rule[];
}

export interface MatchReason {
  field: string;
  text: Localized;
}

export interface SchemeEvaluation {
  slug: string;
  status: EligibilityStatus;
  /** Fraction of rules satisfied in the best group (0..1). */
  matchRatio: number;
  /** Number of rules the user satisfies in the best group (specificity). */
  passedCount: number;
  reasons: MatchReason[];
  /** Fields that, if answered, could settle a "possible" result. */
  missingFields: string[];
  /** Rules whose outcome can't be decided from a range answer (e.g. income band straddles the limit). */
  uncertainReasons: MatchReason[];
}
