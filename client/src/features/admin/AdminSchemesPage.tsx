/**
 * Admin scheme list (FR-17, FR-19): server-side search + pagination over the
 * whole catalogue, filters for source / review / staleness, inline
 * activate / verify, and links to the editor. Filters live in the URL.
 */
import { BadgeCheck, Pencil, Plus, Power } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Input } from '../../components/ui/Field';
import { Label } from '../../components/ui/Label';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { useDebounce } from '../../hooks/useDebounce';
import { useResource } from '../../hooks/useResource';
import { useLocalized } from '../../i18n/useLocalized';
import { api } from '../../lib/api';
import { cn } from '../../lib/cn';
import { formatDate } from '../../lib/format';
import type { AdminSchemeQuery } from '../../lib/types';

const FILTERS: { key: string; query: AdminSchemeQuery; label: string }[] = [
  { key: 'all', query: {}, label: 'admin.filterAll' },
  { key: 'curated', query: { source: 'curated' }, label: 'admin.filterCurated' },
  { key: 'myscheme', query: { source: 'myscheme' }, label: 'admin.filterImported' },
  { key: 'admin', query: { source: 'admin' }, label: 'admin.filterAdmin' },
  { key: 'pending', query: { review: 'pending' }, label: 'admin.filterPending' },
  { key: 'done', query: { review: 'done' }, label: 'admin.filterReviewed' },
  { key: 'stale', query: { stale: '1' }, label: 'admin.filterStale' },
];

export function AdminSchemesPage() {
  const { t } = useTranslation();
  const { l, lang } = useLocalized();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const debouncedQ = useDebounce(q, 300);
  const page = Number(params.get('page') ?? 1);
  const filterKey = params.get('review') === 'pending' ? 'pending' : params.get('review') === 'done' ? 'done' : params.get('stale') ? 'stale' : params.get('source') ?? 'all';
  const filter = FILTERS.find((f) => f.key === filterKey) ?? FILTERS[0];

  const { data, error, loading, reload } = useResource(
    () => api.admin.schemes({ ...filter.query, q: debouncedQ || undefined, page, limit: 50 }),
    [filterKey, debouncedQ, page],
  );

  useEffect(() => {
    const next = new URLSearchParams(params);
    if (debouncedQ) next.set('q', debouncedQ);
    else next.delete('q');
    if (debouncedQ !== (params.get('q') ?? '')) next.delete('page');
    setParams(next, { replace: true });
  }, [debouncedQ]); // eslint-disable-line react-hooks/exhaustive-deps

  const setFilter = (f: (typeof FILTERS)[number]) => {
    const next = new URLSearchParams();
    if (debouncedQ) next.set('q', debouncedQ);
    for (const [k, v] of Object.entries(f.query)) next.set(k, String(v));
    setParams(next, { replace: true });
  };
  const setPage = (p: number) => {
    const next = new URLSearchParams(params);
    next.set('page', String(p));
    setParams(next);
  };
  const act = async (fn: () => Promise<unknown>) => {
    await fn();
    reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl tracking-tight">{t('admin.schemes')}</h1>
          {data && <p className="num kicker mt-1">{t('admin.results', { count: data.total })}</p>}
        </div>
        <ButtonLink to="/admin/schemes/new" icon={<Plus className="size-4" />}>
          {t('admin.newScheme')}
        </ButtonLink>
      </div>

      <div className="flex flex-col gap-4 border-b border-rule pb-4 lg:flex-row lg:items-center">
        <Input placeholder={t('admin.searchSchemes')} aria-label={t('admin.searchSchemes')} value={q} onChange={(e) => setQ(e.target.value)} className="lg:max-w-sm" />
        <div role="group" aria-label={t('admin.source')} className="flex flex-wrap gap-x-5 gap-y-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={f.key === filterKey}
              onClick={() => setFilter(f)}
              className={cn('min-h-9 border-b-2 text-sm transition-colors', f.key === filterKey ? 'border-accent text-ink' : 'border-transparent text-ink-3 hover:text-ink')}
            >
              {t(f.label)}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <ErrorState onRetry={reload} />
      ) : !data ? (
        <LoadingState />
      ) : (
        <>
          <div className={cn('overflow-x-auto transition-opacity', loading && 'opacity-60')}>
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="border-b-2 border-rule-strong">
                <tr className="kicker">
                  <th className="py-2.5 pr-4 font-medium">{t('admin.colName')}</th>
                  <th className="py-2.5 pr-4 font-medium">{t('admin.colStatus')}</th>
                  <th className="py-2.5 pr-4 text-right font-medium">{t('admin.colRules')}</th>
                  <th className="py-2.5 pr-4 font-medium">{t('admin.colVerified')}</th>
                  <th className="py-2.5 text-right font-medium">{t('admin.colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {data.items.map((s) => (
                  <tr key={s.id} className="transition-colors hover:bg-surface/70">
                    <td className="max-w-md py-3 pr-4">
                      <p className="font-medium">{l(s.name)}</p>
                      <p className="font-mono text-xs text-ink-3">
                        {s.slug}
                        {s.state ? ` · ${s.state}` : ''} · {t(`admin.source_${s.source}`)}
                      </p>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-col gap-1">
                        <Label tone={s.isActive ? 'ok' : 'ink'}>{s.isActive ? t('admin.active') : t('admin.inactive')}</Label>
                        {s.needsReview && <Label tone="accent">{t('admin.filterPending')}</Label>}
                        {s.isStale && <Label tone="warn">{t('admin.stale')}</Label>}
                        {!s.matchable && <Label>{t('admin.browseOnly')}</Label>}
                      </div>
                    </td>
                    <td className="num py-3 pr-4 text-right">{s.ruleCount}</td>
                    <td className="num py-3 pr-4 text-ink-2">{formatDate(s.lastVerifiedAt, lang)}</td>
                    <td className="py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" aria-label={t('admin.markVerified')} title={t('admin.markVerified')} onClick={() => act(() => api.admin.verify(s.id))}>
                          <BadgeCheck className="size-4" />
                        </Button>
                        <Button size="sm" variant="ghost" aria-label={s.isActive ? t('admin.deactivate') : t('admin.activate')} title={s.isActive ? t('admin.deactivate') : t('admin.activate')} onClick={() => act(() => api.admin.setActive(s.id, !s.isActive))}>
                          <Power className={s.isActive ? 'size-4 text-ok' : 'size-4 text-ink-3'} />
                        </Button>
                        <ButtonLink to={`/admin/schemes/${s.id}`} size="sm" variant="secondary" icon={<Pencil className="size-3.5" />}>
                          {t('admin.edit')}
                        </ButtonLink>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.pages > 1 && (
            <nav className="flex items-center justify-between border-t border-rule pt-4" aria-label="Pagination">
              <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                {t('admin.prev')}
              </Button>
              <span className="num text-sm text-ink-3">{t('admin.pageOf', { page, pages: data.pages })}</span>
              <Button variant="ghost" size="sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>
                {t('admin.next')}
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
