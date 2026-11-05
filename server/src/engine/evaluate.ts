/**
 * Scheme evaluator (FR-05).
 *
 * Classifies one scheme for one profile:
 *   eligible   — at least one rule group fully passes
 *   possible   — no group passes, but at least one group has no failures
 *                (only unknowns: skipped questions or straddling ranges)
 *   ineligible — every group has at least one failed rule
 *
 * State-specific schemes get an implicit `state = <scheme.state>` rule
 * added to every group, so admins never need to write it by hand.
 */
import { explainRules, explainUncertain } from './explain.js';
import { evaluateRule, isMissing } from './operators.js';
import type { MatchReason, Profile, Rule, RuleOutcome, RuleValue, SchemeEvaluation, SchemeForMatching } from './types.js';

// Grouping depends only on the scheme, so memoise it per rules array
// (rule arrays are stable while the scheme cache holds them).
const groupCache = new WeakMap<Rule[], { state: string | null; groups: Rule[][] }>();

/** Groups rules by groupId and injects the implicit state rule. */
export function groupRules(scheme: Pick<SchemeForMatching, 'state' | 'rules'>): Rule[][] {
  const hit = groupCache.get(scheme.rules);
  if (hit && hit.state === scheme.state) return hit.groups;
  const groups = buildGroups(scheme);
  groupCache.set(scheme.rules, { state: scheme.state, groups });
  return groups;
}

function buildGroups(scheme: Pick<SchemeForMatching, 'state' | 'rules'>): Rule[][] {
  const groups = new Map<number, Rule[]>();
  for (const rule of scheme.rules) {
    if (!groups.has(rule.groupId)) groups.set(rule.groupId, []);
    groups.get(rule.groupId)!.push(rule);
  }
  if (scheme.state) {
    const stateRule = (groupId: number): Rule => ({ groupId, field: 'state', operator: '=', value: scheme.state! });
    if (groups.size === 0) groups.set(1, []);
    for (const [groupId, rules] of groups) {
      if (!rules.some((r) => r.field === 'state')) rules.unshift(stateRule(groupId));
    }
  }
  return [...groups.keys()].sort((a, b) => a - b).map((k) => groups.get(k)!);
}

interface GroupResult {
  outcomes: RuleOutcome[];
  status: 'pass' | 'fail' | 'unknown';
  passed: number;
  ratio: number;
}

function evaluateGroup(rules: Rule[], profile: Profile): GroupResult {
  const outcomes = rules.map((rule) => ({ rule, status: evaluateRule(rule, profile) }));
  const passed = outcomes.filter((o) => o.status === 'pass').length;
  const status = outcomes.some((o) => o.status === 'fail')
    ? 'fail'
    : outcomes.some((o) => o.status === 'unknown')
      ? 'unknown'
      : 'pass';
  return { outcomes, status, passed, ratio: rules.length ? passed / rules.length : 1 };
}

/** Best group = most rules passed, then highest ratio (gives the most specific explanation). */
function best(groups: GroupResult[]): GroupResult | undefined {
  return [...groups].sort((a, b) => b.passed - a.passed || b.ratio - a.ratio)[0];
}

export function evaluateScheme(scheme: SchemeForMatching, profile: Profile): SchemeEvaluation {
  const groups = groupRules(scheme).map((rules) => evaluateGroup(rules, profile));
  const actual = (field: string) => profile[field] as RuleValue | undefined;

  // A scheme with no rules at all is open to everyone.
  if (groups.length === 0) {
    return { slug: scheme.slug, status: 'eligible', matchRatio: 1, passedCount: 0, reasons: [], missingFields: [], uncertainReasons: [] };
  }

  const passing = best(groups.filter((g) => g.status === 'pass'));
  if (passing) {
    return {
      slug: scheme.slug,
      status: 'eligible',
      matchRatio: 1,
      passedCount: passing.passed,
      reasons: explainRules(passing.outcomes.map((o) => o.rule), actual),
      missingFields: [],
      uncertainReasons: [],
    };
  }

  const unknownGroups = groups.filter((g) => g.status === 'unknown');
  if (unknownGroups.length > 0) {
    const chosen = best(unknownGroups)!;
    // Collect what's undecided across ALL open groups: skipped fields, and
    // answered range fields whose band straddles a limit.
    const missing = new Set<string>();
    const uncertain = new Map<string, MatchReason>();
    for (const g of unknownGroups) {
      for (const o of g.outcomes) {
        if (o.status !== 'unknown') continue;
        if (isMissing(profile[o.rule.field])) missing.add(o.rule.field);
        else {
          const text = explainUncertain(o.rule, actual(o.rule.field));
          uncertain.set(text.en, { field: o.rule.field, text });
        }
      }
    }
    return {
      slug: scheme.slug,
      status: 'possible',
      matchRatio: chosen.ratio,
      passedCount: chosen.passed,
      reasons: explainRules(chosen.outcomes.filter((o) => o.status === 'pass').map((o) => o.rule), actual),
      missingFields: [...missing],
      uncertainReasons: [...uncertain.values()],
    };
  }

  const closest = best(groups)!;
  return {
    slug: scheme.slug,
    status: 'ineligible',
    matchRatio: closest.ratio,
    passedCount: closest.passed,
    reasons: [],
    missingFields: [],
    uncertainReasons: [],
  };
}
