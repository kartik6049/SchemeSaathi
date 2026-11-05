/** Segmented progress: one tick per visible step, filled as you go. */
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/cn';

export function ProgressBar({ current, total }: { current: number; total: number }) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="flex gap-1" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={current} aria-label={t('q.stepOf', { current, total })}>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={cn('h-1 flex-1 transition-colors duration-500', i < current ? 'bg-primary' : 'bg-rule')} />
        ))}
      </div>
    </div>
  );
}
