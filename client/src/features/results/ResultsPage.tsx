/**
 * Results (FR-05, FR-07, FR-08, FR-10, FR-12; UC-01, UC-02).
 * The profile lives in the URL (`?p=`), so results are shareable and the
 * server stays stateless. Desktop: ledger of matches + a sticky summary rail
 * (counts, share, checklist). Mobile: the rail's actions sit above the list
 * and the checklist bar sticks to the bottom.
 */
import { Copy, ListChecks, Pencil, RotateCcw, Share2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Disclaimer } from '../../components/layout/Disclaimer';
import { Button, ButtonLink } from '../../components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States';
import { useProfile } from '../../context/ProfileContext';
import { useQuestions } from '../../hooks/useCached';
import { useResource } from '../../hooks/useResource';
import { track } from '../../lib/analytics';
import { api } from '../../lib/api';
import { cn } from '../../lib/cn';
import { decodeProfile, encodeProfile } from '../../lib/profileCodec';
import { whatsappUrl } from '../../lib/share';
import type { Question } from '../../lib/types';
import { ChecklistDialog } from './ChecklistDialog';
import { ResultRow } from './ResultRow';

type Tab = 'eligible' | 'possible';
const PAGE = 30;

export function ResultsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { answers, setAnswers, setStep, reset } = useProfile();
  const questions = useQuestions();

  const encoded = params.get('p');
  const profile = useMemo(() => decodeProfile(encoded), [encoded]);
  const [limit, setLimit] = useState(PAGE);
  const { data, error, loading, reload } = useResource(() => api.match(profile!, limit), [encoded, limit], Boolean(profile));

  const [tab, setTab] = useState<Tab>('eligible');
  const [selected, setSelected] = useState<string[]>([]);
  const [showChecklist, setShowChecklist] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (profile && encodeProfile(profile) !== encodeProfile(answers)) setAnswers(profile);
    setLimit(PAGE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encoded]);

  useEffect(() => {
    if (data && limit === PAGE) setTab(data.eligible.length === 0 && data.possiblyEligible.length > 0 ? 'possible' : 'eligible');
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const questionFor = useMemo(() => {
    const map = new Map<string, { question: Question; step: number }>();
    questions.data?.steps.forEach((s) => s.fields.forEach((q) => map.set(q.key, { question: q, step: s.step })));
    return (field: string) => map.get(field);
  }, [questions.data]);

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20">
        <EmptyState title={t('results.noProfile')} action={<ButtonLink to="/check">{t('home.cta')}</ButtonLink>} />
      </div>
    );
  }

  const items = data ? (tab === 'eligible' ? data.eligible : data.possiblyEligible) : [];
  const tabTotal = data ? (tab === 'eligible' ? data.counts.eligible : data.counts.possible) : 0;
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const shareLink = window.location.href;
  const share = () => {
    track('share');
    window.open(whatsappUrl(`${t('results.shareText', { count: data?.counts.eligible ?? 0 })}\n${shareLink}`), '_blank', 'noopener,noreferrer');
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };
  const startNew = () => {
    reset();
    navigate('/check');
  };

  const actions = (
    <div className="flex flex-wrap gap-2">
      <ButtonLink to="/check" variant="secondary" size="sm" icon={<Pencil className="size-3.5" />} onClick={() => setStep(1)}>
        {t('results.editAnswers')}
      </ButtonLink>
      <Button variant="whatsapp" size="sm" onClick={share} icon={<Share2 className="size-3.5" />}>
        {t('results.share')}
      </Button>
      <Button variant="ghost" size="sm" onClick={copy} icon={<Copy className="size-3.5" />}>
        {copied ? t('results.copied') : t('results.copyLink')}
      </Button>
      <Button variant="ghost" size="sm" onClick={startNew} icon={<RotateCcw className="size-3.5" />}>
        {t('results.startNew')}
      </Button>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pb-32 pt-10 sm:px-6 sm:pt-14">
      {/* Headline */}
      <header className="border-b-2 border-rule-strong pb-8">
        <p className="kicker">{t('results.title')}</p>
        {loading && !data ? (
          <Skeleton className="mt-3 h-12 w-3/4" />
        ) : data ? (
          <h1 className="mt-3 max-w-4xl animate-rise font-serif text-4xl leading-[1.1] tracking-tight sm:text-5xl" aria-live="polite">
            {t('results.summary', { count: data.counts.eligible })}
            {data.counts.possible > 0 && <span className="text-ink-3"> {t('results.possibleSummary', { count: data.counts.possible })}</span>}
          </h1>
        ) : null}
        <Disclaimer className="mt-6" />
        <div className="no-print mt-6 lg:hidden">{actions}</div>
      </header>

      {error && <ErrorState onRetry={reload} />}

      <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_280px]">
        <section>
          {data && (
            <>
              <div role="tablist" className="no-print flex gap-8 border-b border-rule">
                {(['eligible', 'possible'] as Tab[]).map((k) => {
                  const count = k === 'eligible' ? data.counts.eligible : data.counts.possible;
                  return (
                    <button
                      key={k}
                      role="tab"
                      aria-selected={tab === k}
                      onClick={() => setTab(k)}
                      className={cn(
                        '-mb-px flex min-h-12 items-baseline gap-2 border-b-2 text-[15px] transition-colors',
                        tab === k ? 'border-primary font-medium text-ink' : 'border-transparent text-ink-3 hover:text-ink',
                      )}
                    >
                      {t(k === 'eligible' ? 'results.eligibleTab' : 'results.possibleTab')}
                      <span className="num font-serif text-lg">{count}</span>
                    </button>
                  );
                })}
              </div>

              <div role="tabpanel">
                {items.length === 0 ? (
                  <div className="pt-8">
                    {tab === 'eligible' ? (
                      <EmptyState
                        title={t('results.noEligibleTitle')}
                        body={t('results.noEligibleBody')}
                        action={data.counts.possible > 0 ? <Button variant="secondary" onClick={() => setTab('possible')}>{t('results.possibleTab')}</Button> : undefined}
                      />
                    ) : (
                      <EmptyState title={t('results.noPossible')} />
                    )}
                  </div>
                ) : (
                  <>
                    <div className="no-print flex items-center justify-between py-3 text-sm text-ink-3">
                      <span className="num">{t('results.showing', { shown: items.length, total: tabTotal })}</span>
                      <button type="button" className="link text-ink-2" onClick={() => setSelected((s) => [...new Set([...s, ...items.map((i) => i.schemeId)])])}>
                        {t('results.selectAll')}
                      </button>
                    </div>
                    <ul className="border-t border-rule">
                      {items.map((item, i) => (
                        <ResultRow key={item.schemeId} index={i} item={item} kind={tab} selected={selected.includes(item.schemeId)} onToggle={() => toggle(item.schemeId)} questionFor={questionFor} />
                      ))}
                    </ul>
                    {items.length < tabTotal && (
                      <div className="mt-8 flex justify-center">
                        <Button variant="secondary" loading={loading} onClick={() => setLimit((n) => n + PAGE * 2)}>
                          {t('results.showMore')}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
          {loading && !data && (
            <div className="space-y-8 pt-8">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-7 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Summary rail */}
        <aside className="no-print hidden lg:block">
          <div className="sticky top-6 space-y-8">
            {data && (
              <dl className="grid grid-cols-2 border-y border-rule-strong">
                <div className="border-r border-rule py-4 pr-4">
                  <dt className="kicker">{t('results.eligibleTab')}</dt>
                  <dd className="num mt-1 font-serif text-5xl text-ok">{data.counts.eligible}</dd>
                </div>
                <div className="py-4 pl-4">
                  <dt className="kicker">{t('results.possibleTab')}</dt>
                  <dd className="num mt-1 font-serif text-5xl text-warn">{data.counts.possible}</dd>
                </div>
              </dl>
            )}
            <div>
              <p className="kicker mb-3">{t('results.summaryTitle')}</p>
              <div className="[&_a]:w-full [&_button]:w-full [&_div]:flex-col">{actions}</div>
            </div>
            <div className="border-t border-rule pt-5">
              <p className="kicker mb-2">{t('results.checklistTitle')}</p>
              <p className="text-sm text-ink-2">{selected.length ? t('results.selected', { count: selected.length }) : t('results.checklistHint')}</p>
              <Button className="mt-3 w-full" disabled={!selected.length} onClick={() => setShowChecklist(true)} icon={<ListChecks className="size-4" />}>
                {t('results.viewChecklist')}
              </Button>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile checklist bar */}
      {selected.length > 0 && (
        <div className="no-print fixed inset-x-0 bottom-0 z-30 animate-rise border-t-2 border-rule-strong bg-paper/95 px-4 py-3 backdrop-blur-sm lg:hidden">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm font-medium">
              <ListChecks className="size-5 text-primary" />
              {t('results.selected', { count: selected.length })}
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
                {t('common.clear')}
              </Button>
              <Button size="sm" onClick={() => setShowChecklist(true)}>
                {t('results.viewChecklist')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showChecklist && <ChecklistDialog schemeIds={selected} onClose={() => setShowChecklist(false)} />}
    </div>
  );
}
