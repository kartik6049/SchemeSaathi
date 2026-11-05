/** "Likely eligibility" notice required on every results page (SRS §5.1). Styled as a margin note. */
import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/cn';

export function Disclaimer({ className, textKey = 'results.disclaimer' }: { className?: string; textKey?: string }) {
  const { t } = useTranslation();
  return (
    <p role="note" className={cn('flex items-start gap-2.5 border-l-2 border-accent pl-3 text-sm text-ink-2', className)}>
      <Info className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
      {t(textKey)}
    </p>
  );
}
