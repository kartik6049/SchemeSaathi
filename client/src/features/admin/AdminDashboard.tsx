/**
 * Admin dashboard (FR-19, FR-20): catalogue health strip, curated schemes
 * needing re-verification, most viewed schemes, questionnaire step funnel.
 */
import { BadgeCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { useResource } from '../../hooks/useResource';
import { useLocalized } from '../../i18n/useLocalized';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/format';

export function AdminDashboard() {
  const { t } = useTranslation();
  const { l, lang } = useLocalized();
  const { data, error, loading, reload } = useResource(() => api.admin.stats(), []);

  if (loading && !data) return <LoadingState />;
  if (error || !data) return <ErrorState onRetry={reload} />;

  const { usage, catalogue } = data;
  const maxStep = Math.max(1, ...usage.stepCompletions.map((s) => s.count));
  const n = (v: number) => v.toLocaleString('en-IN');

  const strip: [string, string, string?][] = [
    [t('admin.statSchemes'), n(catalogue.active)],
    [t('admin.statMatchable'), n(catalogue.matchable)],
    [t('admin.statReview'), n(catalogue.needsReview), '/admin/schemes?review=pending'],
    [t('admin.statStale'), n(catalogue.stale), '/admin/schemes?stale=1'],
    [t('admin.statMissingHindi'), n(catalogue.missingHindi)],
    [t('admin.statStarts'), n(usage.starts)],
    [t('admin.statCompletion'), `${usage.completionRate}%`],
    [t('admin.statViews'), n(usage.schemeViews)],
  ];

  const verify = async (id: number) => {
    await api.admin.verify(id);
    reload();
  };

  return (
    <div className="space-y-10">
      <h1 className="font-serif text-4xl tracking-tight">{t('admin.dashboard')}</h1>

      <dl className="grid grid-cols-2 border-y-2 border-rule-strong sm:grid-cols-4 lg:grid-cols-8">
        {strip.map(([label, value, href], i) => (
          <div key={label} className={`border-rule py-4 pr-3 ${i % 2 ? 'pl-3 sm:pl-4' : 'sm:pl-4'} sm:border-l sm:first:border-l-0 sm:first:pl-0 max-sm:[&:nth-child(even)]:border-l`}>
            <dt className="kicker leading-tight">{label}</dt>
            <dd className="num mt-1.5 font-serif text-3xl tracking-tight">{href ? <Link to={href} className="hover:text-primary">{value}</Link> : value}</dd>
          </div>
        ))}
      </dl>
      <p className="-mt-6 text-sm text-ink-3">
        {t('admin.source_curated')} {n(catalogue.curated)} · {t('admin.source_myscheme')} {n(catalogue.imported)} · {t('admin.statDownloads')} {n(usage.checklistDownloads)}
      </p>

      <section>
        <h2 className="kicker border-b border-rule-strong pb-2">{t('admin.staleTitle', { days: 180 })}</h2>
        {catalogue.staleSchemes.length === 0 ? (
          <p className="py-4 text-sm text-ink-3">{t('admin.staleNone')}</p>
        ) : (
          <ul className="divide-y divide-rule">
            {catalogue.staleSchemes.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <Link to={`/admin/schemes/${s.id}`} className="font-medium hover:text-primary">{l(s.name)}</Link>
                  <p className="num text-xs text-warn">{formatDate(s.lastVerifiedAt, lang)}</p>
                </div>
                <Button size="sm" variant="secondary" icon={<BadgeCheck className="size-4" />} onClick={() => verify(s.id)}>
                  {t('admin.markVerified')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="kicker border-b border-rule-strong pb-2">{t('admin.topViewed')}</h2>
          {usage.topSchemes.length === 0 ? (
            <p className="py-4 text-sm text-ink-3">{t('admin.noData')}</p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-rule">
                {usage.topSchemes.map((s, i) => (
                  <tr key={s.slug}>
                    <td className="num w-8 py-2.5 text-ink-3">{i + 1}</td>
                    <td className="py-2.5">{l(s.name)}</td>
                    <td className="num py-2.5 text-right">{s.views}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section>
          <h2 className="kicker border-b border-rule-strong pb-2">{t('admin.dropoff')}</h2>
          {usage.stepCompletions.length === 0 ? (
            <p className="py-4 text-sm text-ink-3">{t('admin.noData')}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {usage.stepCompletions.map((s) => (
                <li key={s.step} className="grid grid-cols-[4.5rem_1fr_3rem] items-center gap-3 text-sm" title={`${t('admin.step', { n: s.step })}: ${s.count}`}>
                  <span className="text-ink-3">{t('admin.step', { n: s.step })}</span>
                  <span className="h-2 bg-surface-2">
                    <span className="block h-full bg-primary" style={{ width: `${(s.count / maxStep) * 100}%` }} />
                  </span>
                  <span className="num text-right">{s.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
