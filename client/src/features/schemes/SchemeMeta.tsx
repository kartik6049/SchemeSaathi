/**
 * Scheme metadata as a typographic line ("EDUCATION · UTTAR PRADESH · APPLY BY …")
 * rather than coloured pills. Used by result rows, browse rows and the detail page.
 */
import { CalendarClock } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useMeta } from '../../hooks/useCached';
import { useLocalized } from '../../i18n/useLocalized';
import { cn } from '../../lib/cn';
import { daysUntil, formatDate } from '../../lib/format';
import type { ResultScheme } from '../../lib/types';

export function useSchemeLabels() {
  const { t } = useTranslation();
  const { data } = useMeta();
  const { l } = useLocalized();
  return {
    category: (c: string) => {
      const label = data?.categories.find((x) => x.value === c)?.label;
      return label ? l(label) : c;
    },
    scope: (state: string | null) => {
      if (!state) return t('common.central');
      const label = data?.states.find((x) => x.value === state)?.label;
      return label ? l(label) : state;
    },
  };
}

export function DeadlineNote({ deadline, className }: { deadline: string | null; className?: string }) {
  const { t } = useTranslation();
  const { lang } = useLocalized();
  if (!deadline) return null;
  const days = daysUntil(deadline);
  if (days < 0) return <span className={cn('text-bad', className)}>{t('common.deadlinePassed')}</span>;
  return (
    <span className={cn('inline-flex items-center gap-1', days <= 30 ? 'text-warn' : '', className)}>
      <CalendarClock className="size-3" aria-hidden />
      {days <= 30 ? t('common.daysLeft', { count: days }) : t('common.deadline', { date: formatDate(deadline, lang) })}
    </span>
  );
}

export function SchemeMetaLine({ scheme, extra }: { scheme: Pick<ResultScheme, 'category' | 'state' | 'deadline'>; extra?: ReactNode }) {
  const labels = useSchemeLabels();
  const parts: ReactNode[] = [labels.category(scheme.category), labels.scope(scheme.state)];
  if (scheme.deadline) parts.push(<DeadlineNote deadline={scheme.deadline} />);
  if (extra) parts.push(extra);
  return (
    <p className="kicker flex flex-wrap items-center gap-x-2 gap-y-1">
      {parts.map((p, i) => (
        <Fragment key={i}>
          {i > 0 && <span aria-hidden className="text-rule">/</span>}
          <span>{p}</span>
        </Fragment>
      ))}
    </p>
  );
}

/** Provenance mark for auto-imported, unreviewed schemes. */
export function ReviewMark({ needsReview }: { needsReview: boolean }) {
  const { t } = useTranslation();
  if (!needsReview) return null;
  return <span className="normal-case tracking-normal text-ink-3">{t('common.reviewPending')}</span>;
}
