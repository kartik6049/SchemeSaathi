/**
 * One matched scheme as a ledger row: status mark, metadata line, serif name,
 * summary, the "why you match" reasons (FR-08), what is still unknown for
 * "possibly eligible", and a checkbox to add it to the document checklist.
 */
import { ArrowRight, Check, CircleCheck, CircleHelp, TriangleAlert } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useLocalized } from '../../i18n/useLocalized';
import { cn } from '../../lib/cn';
import type { MatchItem, Question } from '../../lib/types';
import { SchemeMetaLine } from '../schemes/SchemeMeta';

interface Props {
  item: MatchItem;
  kind: 'eligible' | 'possible';
  selected: boolean;
  onToggle: () => void;
  questionFor: (field: string) => { question: Question; step: number } | undefined;
  index: number;
}

export function ResultRow({ item, kind, selected, onToggle, questionFor, index }: Props) {
  const { t } = useTranslation();
  const { l } = useLocalized();
  const checkId = useId();
  const { scheme } = item;
  const StatusIcon = kind === 'eligible' ? CircleCheck : CircleHelp;

  return (
    <li className="animate-rise border-b border-rule" style={{ animationDelay: `${Math.min(index, 10) * 35}ms` }}>
      <div className={cn('grid grid-cols-[28px_1fr] gap-3 py-6 transition-colors sm:grid-cols-[28px_1fr_auto] sm:gap-5', selected && 'bg-primary-soft/50')}>
        <StatusIcon aria-label={t(kind === 'eligible' ? 'results.eligibleTab' : 'results.possibleTab')} className={cn('mt-0.5 size-6', kind === 'eligible' ? 'text-ok' : 'text-warn')} strokeWidth={1.75} />

        <div className="min-w-0 space-y-2">
          <SchemeMetaLine scheme={scheme} />
          <h3 className="font-serif text-[22px] leading-snug tracking-tight">
            <Link to={`/schemes/${scheme.slug}`} className="transition-colors hover:text-primary">
              {l(scheme.name)}
            </Link>
          </h3>
          <p className="max-w-3xl text-[15px] text-ink-2">{l(scheme.summary)}</p>

          {item.reasons.length > 0 && (
            <ul className="flex flex-wrap gap-x-5 gap-y-1 pt-1 text-sm" aria-label={t('results.whyMatch')}>
              {item.reasons.map((r, i) => (
                <li key={i} className="inline-flex items-center gap-1.5 text-ink">
                  <Check className="size-3.5 text-ok" strokeWidth={3} aria-hidden /> {l(r.text)}
                </li>
              ))}
            </ul>
          )}

          {kind === 'possible' && (item.missingFields?.length || item.uncertainReasons?.length) ? (
            <div className="space-y-1.5 border-l-2 border-warn pl-3 text-sm">
              {item.missingFields && item.missingFields.length > 0 && (
                <div>
                  <span className="font-medium text-warn">{t('results.toConfirm')} </span>
                  {item.missingFields.map((f, i) => {
                    const q = questionFor(f);
                    return (
                      <span key={f}>
                        {i > 0 && ', '}
                        {q ? (
                          <Link to={`/check?step=${q.step}`} className="link">
                            {l(q.question.label)}
                          </Link>
                        ) : (
                          f
                        )}
                      </span>
                    );
                  })}
                </div>
              )}
              {item.uncertainReasons?.map((r, i) => (
                <p key={i} className="flex items-start gap-1.5 text-ink-2">
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warn" aria-hidden /> {l(r.text)}
                </p>
              ))}
            </div>
          ) : null}

          {scheme.needsReview && <p className="text-xs text-ink-3">{t('results.autoMatched')}</p>}

          <Link to={`/schemes/${scheme.slug}`} className="inline-flex items-center gap-1 pt-1 text-sm font-medium text-primary hover:gap-2" style={{ transition: 'gap .15s' }}>
            {t('results.viewDetails')} <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <label htmlFor={checkId} className="col-start-2 flex min-h-11 cursor-pointer items-center gap-2 self-start text-sm text-ink-2 sm:col-start-auto">
          <input id={checkId} type="checkbox" checked={selected} onChange={onToggle} className="size-5 accent-[var(--primary)]" />
          <span className="sm:sr-only lg:not-sr-only">{selected ? t('results.inChecklist') : t('results.addToChecklist')}</span>
        </label>
      </div>
    </li>
  );
}
