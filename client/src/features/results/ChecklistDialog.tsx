/**
 * Combined, de-duplicated document checklist for the selected schemes
 * (FR-10, UC-02): tick items on screen, print, or download a PDF.
 */
import { Download, Printer, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { useResource } from '../../hooks/useResource';
import { useLocalized } from '../../i18n/useLocalized';
import { track } from '../../lib/analytics';
import { api } from '../../lib/api';
import { cn } from '../../lib/cn';

export function ChecklistDialog({ schemeIds, onClose }: { schemeIds: string[]; onClose: () => void }) {
  const { t } = useTranslation();
  const { l, lang } = useLocalized();
  const ref = useRef<HTMLDialogElement>(null);
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const { data, error, loading, reload } = useResource(() => api.checklist(schemeIds), [schemeIds.join(',')]);

  // Open as a modal on mount. No close() in cleanup: closing fires onClose,
  // which under StrictMode's double-invoked effects would unmount us immediately.
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal?.();
  }, []);

  const download = async () => {
    setDownloading(true);
    try {
      await api.downloadChecklist(schemeIds, lang);
      track('checklist_download');
    } finally {
      setDownloading(false);
    }
  };

  const toggle = (code: string) =>
    setTicked((s) => {
      const n = new Set(s);
      if (n.has(code)) n.delete(code);
      else n.add(code);
      return n;
    });

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="checklist-title"
      className="print-area m-auto max-h-[88dvh] w-[min(44rem,calc(100%-2rem))] rounded-md border border-rule bg-paper p-0 text-ink shadow-2xl backdrop:bg-ink/50 open:animate-rise"
    >
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b-2 border-rule-strong bg-paper px-6 pb-4 pt-5">
        <div>
          <p className="kicker">{t('results.checklistFor', { count: schemeIds.length })}</p>
          <h2 id="checklist-title" className="mt-1 font-serif text-3xl tracking-tight">
            {t('results.checklistTitle')}
          </h2>
        </div>
        <button type="button" onClick={onClose} aria-label={t('common.close')} className="no-print rounded-md p-2 text-ink-3 hover:bg-surface-2 hover:text-ink">
          <X className="size-5" />
        </button>
      </div>

      <div className="px-6 py-2">
        {loading && <LoadingState />}
        {error && <ErrorState onRetry={reload} />}
        {data && (
          <ol className="divide-y divide-rule">
            {data.documents.map((d, i) => (
              <li key={d.code}>
                <label className="flex cursor-pointer items-start gap-4 py-3.5">
                  <span className="num w-6 pt-0.5 text-right font-serif text-ink-3">{i + 1}</span>
                  <input type="checkbox" className="mt-1 size-5 shrink-0 accent-[var(--primary)]" checked={ticked.has(d.code)} onChange={() => toggle(d.code)} />
                  <span>
                    <span className={cn('block font-medium transition-opacity', ticked.has(d.code) && 'line-through opacity-50')}>{l(d.name)}</span>
                    <span className="block text-xs text-ink-3">
                      {t('results.neededFor')}: {d.schemes.map((s) => l(s.name)).join(' · ')}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="no-print sticky bottom-0 flex flex-col gap-2 border-t border-rule bg-paper px-6 py-4 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={() => window.print()} icon={<Printer className="size-4" />}>
          {t('results.print')}
        </Button>
        <Button onClick={download} loading={downloading} icon={<Download className="size-4" />}>
          {downloading ? t('results.downloading') : t('results.downloadPdf')}
        </Button>
      </div>
    </dialog>
  );
}
