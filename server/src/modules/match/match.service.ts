/**
 * Matching service (FR-05, FR-07, FR-08).
 * Evaluates every matchable scheme against the profile in memory (stateless —
 * the profile is never stored, NFR-07), then ranks the results.
 *
 * With ~4,600 schemes, most of them state-specific, a per-state index means a
 * request only evaluates central schemes plus the user's state, and only the
 * top `limit` results per list are returned (counts are always complete).
 */
import { evaluateScheme, rank, relevanceScore, type Profile, type SchemeForMatching } from '../../engine/index.js';
import { getMatchIndex } from '../schemes/schemes.service.js';
import type { Scheme, SchemeSummary } from '../schemes/schemes.types.js';

/** What a result card needs — kept small because a response can list hundreds of schemes. */
export type ResultScheme = Pick<SchemeSummary, 'slug' | 'name' | 'state' | 'category' | 'summary' | 'benefitTier' | 'deadline' | 'lastVerifiedAt' | 'source' | 'needsReview'>;

const toResult = (s: Scheme): ResultScheme => ({
  slug: s.slug, name: s.name, state: s.state, category: s.category, summary: s.summary, benefitTier: s.benefitTier,
  deadline: s.deadline, lastVerifiedAt: s.lastVerifiedAt, source: s.source, needsReview: s.needsReview,
});

export function toMatchable(s: Pick<Scheme, 'slug' | 'state' | 'benefitTier' | 'deadline' | 'rules'>): SchemeForMatching {
  return { slug: s.slug, state: s.state, benefitTier: s.benefitTier, deadline: s.deadline, rules: s.rules };
}

/** Curated (hand-checked) schemes get a small boost over auto-imported ones with the same match. */
const REVIEW_PENALTY = 0.05;

export interface MatchOptions {
  limit?: number;
  today?: Date;
}

export async function matchProfile(profile: Profile, { limit = 30, today = new Date() }: MatchOptions = {}) {
  const index = await getMatchIndex();
  const todayStr = today.toISOString().slice(0, 10);
  const userState = typeof profile.state === 'string' ? profile.state : undefined;

  // Only central/multi-state schemes plus the user's own state can match (others are counted as not eligible).
  const candidates = userState ? [...(index.byState.get(null) ?? []), ...(index.byState.get(userState) ?? [])] : index.all;
  const eligible = [];
  const possible = [];
  let notEligible = index.all.length - candidates.length;

  for (const scheme of candidates) {
    const matchable = toMatchable(scheme);
    const ev = evaluateScheme(matchable, profile);
    if (ev.status === 'ineligible') {
      notEligible++;
      continue;
    }
    const score = Math.max(0, relevanceScore(ev, matchable, today) - (scheme.needsReview ? REVIEW_PENALTY : 0));
    const base = {
      schemeId: scheme.slug,
      score: Math.round(score * 100) / 100,
      reasons: ev.reasons,
      deadlinePassed: Boolean(scheme.deadline && scheme.deadline < todayStr),
      scheme: toResult(scheme),
    };
    if (ev.status === 'eligible') eligible.push({ item: base, score: base.score });
    else possible.push({ item: { ...base, missingFields: ev.missingFields, uncertainReasons: ev.uncertainReasons }, score: base.score });
  }

  const byName = (i: { scheme: ResultScheme }) => i.scheme.name.en;
  return {
    eligible: rank(eligible, byName).slice(0, limit).map((r) => r.item),
    possiblyEligible: rank(possible, byName).slice(0, limit).map((r) => r.item),
    counts: { eligible: eligible.length, possible: possible.length, notEligible, total: index.all.length },
    limit,
  };
}
