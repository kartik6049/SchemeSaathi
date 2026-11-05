/**
 * Scheme detail (FR-09, FR-15, NFR-14), laid out as an article:
 * kicker + serif headline + deck, numbered sections (Benefits, Who can apply,
 * Documents, How to apply) and an "At a glance" fact sheet in the margin with
 * the official link, last-verified date, read-aloud and share.
 */
import { ArrowLeft, ExternalLink, FileText, Share2, Volume2, VolumeX } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Disclaimer } from '../../components/layout/Disclaimer';
import { Button, ButtonLink, buttonClass } from '../../components/ui/Button';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { useResource } from '../../hooks/useResource';
import { useSpeech } from '../../hooks/useSpeech';
import { useLocalized } from '../../i18n/useLocalized';
import { track } from '../../lib/analytics';
import { ApiError, api } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { whatsappUrl } from '../../lib/share';
import type { Localized } from '../../lib/types';
import { NotFoundPage } from '../../pages/NotFoundPage';
import { DeadlineNote, useSchemeLabels } from './SchemeMeta';

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 border-t border-rule pt-6 sm:grid-cols-[56px_1fr]" aria-labelledby={`sec-${n}`}>
      <span aria-hidden className="num font-serif text-2xl text-accent">{String(n).padStart(2, '0')}</span>
      <div>
        <h2 id={`sec-${n}`} className="font-serif text-2xl tracking-tight">{title}</h2>
        <div className="mt-3 text-[16px] leading-[1.75] text-ink">{children}</div>
      </div>
    </section>
  );
}

/** Renders imported multi-line text (bullets / steps) with paragraph breaks. */
function Prose({ text }: { text: string }) {
  const lines = text.split(/\n+/).filter(Boolean);
  if (lines.every((x) => x.startsWith('•'))) {
    return (
      <ul className="space-y-2">
        {lines.map((x, i) => (
          <li key={i} className="flex gap-3">
            <span aria-hidden className="mt-[11px] size-1.5 shrink-0 bg-primary" />
            <span>{x.replace(/^•\s*/, '')}</span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="max-w-[68ch] space-y-3">
      {lines.map((x, i) => (
        <p key={i}>{x}</p>
      ))}
    </div>
  );
}

export function SchemeDetailPage() {
  const { slug = '' } = useParams();
  const { t } = useTranslation();
  const { l, lang, untranslated } = useLocalized();
  const labels = useSchemeLabels();
  const navigate = useNavigate();
  const speech = useSpeech();
  const { data: s, error, loading, reload } = useResource(() => api.scheme(slug), [slug]);

  useEffect(() => {
    if (s) {
      track('scheme_view', { schemeSlug: s.slug });
      document.title = `${l(s.name)} — ${t('app.name')}`;
    }
    return () => {
      document.title = 'SchemeSaathi';
    };
  }, [s]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <LoadingState />;
  if (error instanceof ApiError && error.status === 404) return <NotFoundPage />;
  if (error || !s) return <ErrorState onRetry={reload} />;

  const text = (x: Localized) => (l(x) ? <Prose text={l(x)} /> : <p className="text-ink-3">{t('detail.notListed')}</p>);
  const readAloud = () =>
    speech.speaking
      ? speech.stop()
      : speech.speak(
          [l(s.name), l(s.summary), `${t('detail.benefits')}. ${l(s.benefits)}`, `${t('detail.eligibility')}. ${l(s.eligibility)}`].join('. '),
          untranslated(s.name) ? 'en' : lang,
        );
  const share = () => {
    track('share');
    window.open(whatsappUrl(`${l(s.name)}\n${window.location.href}`), '_blank', 'noopener,noreferrer');
  };

  const facts: [string, ReactNode][] = [
    [t('detail.ministry'), l(s.ministry)],
    [t('detail.scope'), labels.scope(s.state)],
    [t('detail.category'), labels.category(s.category)],
    [t('detail.verified'), <span className="num">{formatDate(s.lastVerifiedAt, lang)}</span>],
  ];
  if (s.deadline) facts.push([t('detail.deadlineLabel'), <DeadlineNote deadline={s.deadline} />]);

  return (
    <article className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 sm:pt-10">
      <button type="button" onClick={() => navigate(-1)} className="no-print inline-flex min-h-11 items-center gap-1.5 text-sm text-ink-3 transition-colors hover:text-ink">
        <ArrowLeft className="size-4" /> {t('detail.back')}
      </button>

      <header className="mt-4 animate-rise border-b-2 border-rule-strong pb-8">
        <p className="kicker">
          {labels.category(s.category)} · {labels.scope(s.state)}
        </p>
        <h1 className="mt-3 max-w-4xl font-serif text-4xl leading-[1.08] tracking-tight sm:text-5xl lg:text-[56px]">{l(s.name)}</h1>
        <p className="mt-4 max-w-3xl font-serif text-xl italic leading-snug text-ink-2 sm:text-2xl">{l(s.summary)}</p>
        {untranslated(s.name) && <p className="mt-4 text-sm text-ink-3">{t('common.hindiPending')}</p>}
      </header>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_300px]">
        <div className="space-y-10">
          {s.needsReview && <Disclaimer textKey="detail.sourceNote" />}
          <Section n={1} title={t('detail.benefits')}>{text(s.benefits)}</Section>
          <Section n={2} title={t('detail.eligibility')}>{text(s.eligibility)}</Section>
          <Section n={3} title={t('detail.documents')}>
            {s.documents.length ? (
              <ul className="grid gap-x-8 sm:grid-cols-2">
                {s.documents.map((d) => (
                  <li key={d.code} className="flex items-start gap-3 border-b border-rule/70 py-2.5 text-[15px]">
                    <FileText className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden /> {l(d.name)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-ink-3">{t('detail.notListed')}</p>
            )}
          </Section>
          <Section n={4} title={t('detail.howToApply')}>
            {text(s.howToApply)}
            <a href={s.officialUrl} target="_blank" rel="noopener noreferrer" className="link mt-4 inline-flex items-center gap-1.5 break-all text-primary">
              {s.officialUrl} <ExternalLink className="size-3.5 shrink-0" />
            </a>
          </Section>
          <Disclaimer textKey="detail.notGov" />
        </div>

        {/* Fact sheet */}
        <aside className="no-print lg:sticky lg:top-6 lg:self-start">
          <p className="kicker border-b border-rule-strong pb-2">{t('detail.facts')}</p>
          <dl className="divide-y divide-rule">
            {facts.map(([k, v]) => (
              <div key={k} className="py-3">
                <dt className="kicker">{k}</dt>
                <dd className="mt-1 text-[15px]">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 space-y-2.5">
            <a href={s.officialUrl} target="_blank" rel="noopener noreferrer" className={buttonClass('primary', 'lg', 'w-full')}>
              {t('detail.applyOfficial')} <ExternalLink className="size-4" />
            </a>
            <div className="grid grid-cols-2 gap-2.5">
              {speech.supported && (
                <Button variant="secondary" onClick={readAloud} icon={speech.speaking ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}>
                  {speech.speaking ? t('detail.stopReading') : t('detail.readAloud')}
                </Button>
              )}
              <Button variant="secondary" onClick={share} icon={<Share2 className="size-4" />} className={speech.supported ? '' : 'col-span-2'}>
                {t('detail.share')}
              </Button>
            </div>
            <ButtonLink to="/check" variant="ghost" className="w-full">
              {t('detail.checkEligibility')}
            </ButtonLink>
          </div>
        </aside>
      </div>
    </article>
  );
}
