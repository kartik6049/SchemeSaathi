/**
 * Browse & search (FR-11). Filters live in the URL so searches can be shared
 * and the back button works. Desktop: filter index on the left, ledger of
 * results on the right. Mobile: filters collapse above the list.
 */
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Field';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States';
import { useMeta } from '../../hooks/useCached';
import { useDebounce } from '../../hooks/useDebounce';
import { useLocalized } from '../../i18n/useLocalized';
import { api } from '../../lib/api';
import { cn } from '../../lib/cn';
import type { SchemeSummary } from '../../lib/types';
import { SchemeRow } from './SchemeRow';

const PAGE_SIZE = 25;

export function SchemesPage() {
  const { t } = useTranslation();
  const { l } = useLocalized();
  const meta = useMeta();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const debouncedQ = useDebounce(q, 300);

  const category = params.get('category') ?? '';
  const state = params.get('state') ?? '';
  const beneficiary = params.get('beneficiary') ?? '';

  const [items, setItems] = useState<SchemeSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  useEffect(() => {
    setFilter('q', debouncedQ.trim());
  }, [debouncedQ]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, category, state, beneficiary]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    api
      .searchSchemes({ q: debouncedQ.trim() || undefined, category, state, beneficiary, page, limit: PAGE_SIZE })
      .then((res) => {
        if (!alive) return;
        setItems((prev) => (page === 1 ? res.items : [...prev, ...res.items]));
        setTotal(res.total);
        setPages(res.pages);
      })
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [debouncedQ, category, state, beneficiary, page, attempt]);

  const hasFilters = Boolean(q || category || state || beneficiary);
  const counts = meta.data?.counts;

  const filterIndex = (
    <nav aria-label={t('admin.category')} className="space-y-6">
      <div>
        <p className="kicker border-b border-rule-strong pb-2">{t('detail.category')}</p>
        <ul className="mt-1">
          {[{ value: '', label: null as null | { en: string; hi: string } }, ...(meta.data?.categories ?? [])].map((c) => {
            const active = category === c.value;
            const n = c.value ? counts?.byCategory[c.value] : counts?.total;
            if (c.value && !n) return null;
            return (
              <li key={c.value || 'all'}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter('category', active ? '' : c.value)}
                  className={cn('flex min-h-10 w-full items-baseline gap-2 border-b border-rule/60 py-1.5 text-left text-[15px] transition-colors', active ? 'font-medium text-primary' : 'text-ink-2 hover:text-ink')}
                >
                  <span className="flex-1">{c.label ? l(c.label) : t('schemes.allCategories')}</span>
                  <span className="num text-xs text-ink-3">{n?.toLocaleString('en-IN')}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="space-y-3">
        <Select aria-label={t('schemes.state')} value={state} onChange={(e) => setFilter('state', e.target.value)}>
          <option value="">{t('schemes.allStates')}</option>
          {meta.data?.states.map((s) => (
            <option key={s.value} value={s.value}>
              {l(s.label)}
            </option>
          ))}
        </Select>
        <Select aria-label={t('schemes.beneficiary')} value={beneficiary} onChange={(e) => setFilter('beneficiary', e.target.value)}>
          <option value="">{t('schemes.allBeneficiaries')}</option>
          {meta.data?.beneficiaryTypes.map((b) => (
            <option key={b.value} value={b.value}>
              {l(b.label)}
            </option>
          ))}
        </Select>
      </div>
    </nav>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:px-6 sm:pt-14">
      <header className="grid gap-4 border-b-2 border-rule-strong pb-6 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="kicker">{t('nav.browse')}</p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">{t('schemes.title')}</h1>
          <p className="mt-2 max-w-xl text-ink-2">{t('schemes.subtitle', { total: (counts?.total ?? 0).toLocaleString('en-IN') })}</p>
        </div>
      </header>

      {/* Search */}
      <div className="relative mt-8">
        <Search className="pointer-events-none absolute left-0 top-1/2 size-6 -translate-y-1/2 text-ink-3" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('schemes.searchPlaceholder')}
          aria-label={t('schemes.searchPlaceholder')}
          className="h-16 w-full border-0 border-b border-rule bg-transparent pl-10 pr-2 font-serif text-2xl placeholder:text-ink-3 focus:border-primary focus:outline-none focus-visible:outline-0 sm:text-3xl"
        />
      </div>

      <div className="mt-8 grid gap-10 md:grid-cols-[240px_1fr]">
        <aside>
          <button type="button" className="flex min-h-11 items-center gap-2 text-sm font-medium md:hidden" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((o) => !o)}>
            <SlidersHorizontal className="size-4" /> {t('detail.category')} / {t('schemes.state')}
          </button>
          <div className={cn('md:block', filtersOpen ? 'mt-3 block' : 'hidden')}>{filterIndex}</div>
        </aside>

        <section aria-live="polite">
          <div className="flex min-h-8 items-center justify-between gap-3 border-b border-rule-strong pb-2">
            <p className="kicker num">{!loading || page > 1 ? t('schemes.resultsCount', { count: total }) : ''}</p>
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setQ('');
                  setParams({}, { replace: true });
                }}
                className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"
              >
                <X className="size-3.5" /> {t('schemes.clearFilters')}
              </button>
            )}
          </div>

          {error ? (
            <ErrorState onRetry={() => setAttempt((a) => a + 1)} />
          ) : loading && page === 1 ? (
            <div className="space-y-6 pt-6">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="pt-6">
              <EmptyState title={t('schemes.noMatch')} />
            </div>
          ) : (
            <>
              <ul>
                {items.map((s, i) => (
                  <SchemeRow key={s.slug} scheme={s} index={i} />
                ))}
              </ul>
              {page < pages && (
                <div className="mt-8 flex justify-center">
                  <Button variant="secondary" loading={loading} onClick={() => setPage((p) => p + 1)}>
                    {t('schemes.loadMore')}
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
