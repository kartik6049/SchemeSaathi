/**
 * Scheme catalogue service.
 *
 * Keeps an in-memory cache of all active schemes (with rules) because the
 * matcher evaluates every scheme on every request (NFR-01: p95 < 500 ms).
 * The cache is refreshed after a short TTL and invalidated immediately on
 * any admin write, so new schemes appear in results without a redeploy (FR-06).
 */
import * as repo from './schemes.repository.js';
import type { Scheme } from './schemes.types.js';

const TTL_MS = 60_000;

/** Matchable schemes indexed by state: `null` holds central / multi-state schemes. */
export interface MatchIndex {
  all: Scheme[];
  byState: Map<string | null, Scheme[]>;
}

let cache: { at: number; index: MatchIndex } | null = null;
let inflight: Promise<MatchIndex> | null = null;

function buildIndex(schemes: Scheme[]): MatchIndex {
  const byState = new Map<string | null, Scheme[]>();
  for (const s of schemes) {
    if (!byState.has(s.state)) byState.set(s.state, []);
    byState.get(s.state)!.push(s);
  }
  return { all: schemes, byState };
}

export async function getMatchIndex(): Promise<MatchIndex> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.index;
  if (!inflight) {
    inflight = repo
      .findMatchable()
      .then((schemes) => {
        const index = buildIndex(schemes);
        cache = { at: Date.now(), index };
        return index;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function invalidateSchemeCache() {
  cache = null;
}
