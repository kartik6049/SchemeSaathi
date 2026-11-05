/**
 * Process-wide cache for data that rarely changes (questions, filter meta).
 * Each key is fetched once per page load and shared by all components.
 */
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { MetaResponse, QuestionsResponse } from '../lib/types';

const cache = new Map<string, Promise<unknown>>();

function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  if (!cache.has(key)) {
    const p = fetcher().catch((e) => {
      cache.delete(key); // allow retry after failures
      throw e;
    });
    cache.set(key, p);
  }
  return cache.get(key) as Promise<T>;
}

function useCachedResource<T>(key: string, fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    cached(key, fetcher)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);
  return { data, error, loading: !data && !error, retry: () => (setError(null), setAttempt((a) => a + 1)) };
}

export const useQuestions = () => useCachedResource<QuestionsResponse>('questions', api.questions);
export const useMeta = () => useCachedResource<MetaResponse>('meta', api.meta);

/** Test helper */
export function __clearCache() {
  cache.clear();
}
