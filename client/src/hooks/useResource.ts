/**
 * Minimal data-fetching hook with loading/error state and request
 * cancellation on unmount or dependency change.
 *   const { data, loading, error, reload } = useResource(() => api.scheme(slug), [slug]);
 */
import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';

export function useResource<T>(fetcher: () => Promise<T>, deps: DependencyList, enabled = true) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcherRef
      .current()
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e as Error))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload, setData };
}
