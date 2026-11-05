/**
 * Front page, composed like a broadsheet:
 *  - lead: serif headline (left) + a "notice" column with live catalogue counts
 *  - three numbered steps separated by vertical rules
 *  - an index of schemes by subject (book-index leaders + live counts)
 *  - a beta notice linking to the terms of use
 *  - a pull-quote for volunteers and the "never pay anyone" warning
 */
import { ArrowRight, Info, Search, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Seal } from '../components/layout/Logo';
import { ButtonLink } from '../components/ui/Button';
import { Skeleton } from '../components/ui/States';
import { useProfile } from '../context/ProfileContext';
import { useMeta } from '../hooks/useCached';
import { useLocalized } from '../i18n/useLocalized';

const fmt = (n?: number) => (n === undefined ? '—' : n.toLocaleString('en-IN'));

export function HomePage() {
  const { t } = useTranslation();
  const { l } = useLocalized();
  const { hasProgress } = useProfile();
  const meta = useMeta();
  const counts = meta.data?.counts;

  const categories = (meta.data?.categories ?? [])
    .map((c) => ({ ...c, count: counts?.byCategory[c.value] ?? 0 }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      {/* Lead */}
      <section className="grid gap-10 border-b-2 border-rule-strong pb-14 pt-12 lg:grid-cols-[1fr_320px] lg:gap-16 lg:pt-16">
        <div className="animate-rise">
          <p className="kicker">{t('home.kicker')}</p>
          <h1 className="mt-5 font-serif text-[44px] leading-[1.02] tracking-[-0.02em] sm:text-6xl lg:text-[76px]">
            {t('home.heroTitle')} <em className="text-primary">{t('home.heroTitleAccent')}</em>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-2">{t('home.heroSubtitle')}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink to="/check" size="lg">
              {hasProgress ? t('home.ctaResume') : t('home.cta')} <ArrowRight className="size-5" />
            </ButtonLink>
            <ButtonLink to="/schemes" size="lg" variant="secondary" icon={<Search className="size-5" />}>
              {t('home.browseCta')}
            </ButtonLink>
          </div>
          <p className="kicker mt-5">{t('home.badge')} · {t('home.minutes')}</p>
        </div>

        {/* Notice column */}
        <aside className="animate-fade lg:border-l lg:border-rule lg:pl-10" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center gap-3 border-b border-rule-strong pb-3">
            <Seal className="size-7 text-accent" />
            <p className="kicker">{t('home.noticeTitle')}</p>
          </div>
          <dl className="divide-y divide-rule">
            {[
              [counts?.total, t('home.statSchemes')],
              [counts?.central, t('home.statCentral')],
              [counts ? counts.states : undefined, t('home.statStates')],
              [0, t('home.statLogin')],
            ].map(([value, label], i) => (
              <div key={i} className="flex items-baseline justify-between gap-4 py-4">
                <dt className="text-sm text-ink-2">{label}</dt>
                <dd className="num font-serif text-4xl tracking-tight">{meta.loading && i < 3 ? <Skeleton className="h-9 w-20" /> : fmt(value as number)}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 flex items-start gap-2 border-t border-rule pt-4 text-sm text-bad">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {t('home.warning')}
          </p>
        </aside>
      </section>

      {/* Beta notice + terms */}
      <section className="flex items-start gap-3 border-b border-rule py-5 text-sm text-ink-2" aria-labelledby="beta">
        <Info className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
        <p>
          <strong id="beta" className="font-medium text-ink">{t('home.betaTitle')}.</strong> {t('home.betaBody')}{' '}
          <Link to="/terms" className="link">{t('home.betaLink')}</Link>.
        </p>
      </section>

      {/* Three steps */}
      <section className="border-b border-rule py-14" aria-labelledby="steps">
        <h2 id="steps" className="kicker">{t('home.stepsTitle')}</h2>
        <ol className="mt-6 grid gap-8 md:grid-cols-3 md:gap-0 md:divide-x md:divide-rule">
          {(['how1', 'how2', 'how3'] as const).map((k, i) => (
            <li key={k} className="md:px-8 md:first:pl-0 md:last:pr-0">
              <span className="num font-serif text-5xl text-accent">{i + 1}</span>
              <h3 className="mt-3 font-serif text-2xl tracking-tight">{t(`home.${k}Title`)}</h3>
              <p className="mt-2 text-ink-2">{t(`home.${k}Body`)}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Index of schemes */}
      <section className="grid gap-8 border-b border-rule py-14 lg:grid-cols-[320px_1fr] lg:gap-16" aria-labelledby="index">
        <div>
          <h2 id="index" className="font-serif text-4xl tracking-tight">{t('home.indexTitle')}</h2>
          <p className="mt-3 text-ink-2">{t('home.indexBody')}</p>
          <Link to="/schemes" className="link mt-5 inline-flex items-center gap-1.5 font-medium">
            {t('home.browseCta')} <ArrowRight className="size-4" />
          </Link>
        </div>
        <ul className="grid gap-x-12 sm:grid-cols-2">
          {meta.loading
            ? Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="my-3 h-5" />)
            : categories.map((c) => (
                <li key={c.value}>
                  <Link to={`/schemes?category=${c.value}`} className="group flex min-h-12 items-baseline gap-2 border-b border-rule/70 py-2.5">
                    <span className="transition-colors group-hover:text-primary">{l(c.label)}</span>
                    <span aria-hidden className="mb-1 flex-1 border-b border-dotted border-ink-3/50" />
                    <span className="num text-sm text-ink-2">{fmt(c.count)}</span>
                  </Link>
                </li>
              ))}
        </ul>
      </section>

      {/* Pull-quote for volunteers */}
      <section className="grid gap-8 py-14 lg:grid-cols-[1fr_320px] lg:gap-16">
        <blockquote className="border-l-4 border-accent pl-6">
          <p className="font-serif text-3xl leading-snug tracking-tight sm:text-4xl">{t('home.helperTitle')}</p>
          <p className="mt-4 max-w-2xl text-lg text-ink-2">{t('home.helperBody')}</p>
        </blockquote>
        <div className="space-y-6">
          {(['f1', 'f2', 'f3'] as const).map((k) => (
            <div key={k} className="border-t border-rule pt-3">
              <h3 className="font-medium">{t(`home.${k}Title`)}</h3>
              <p className="mt-1 text-sm text-ink-2">{t(`home.${k}Body`)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
