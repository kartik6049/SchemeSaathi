/** Segmented EN | हिं switch (FR-13). The inactive option is the button. */
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/cn';

export function LanguageToggle({ className }: { className?: string }) {
  const { i18n, t } = useTranslation();
  const current = i18n.language === 'hi' ? 'hi' : 'en';
  return (
    <div role="group" aria-label={t('common.language')} className={cn('flex h-10 items-stretch rounded-md border border-rule text-sm', className)}>
      {(['en', 'hi'] as const).map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={current === l}
          onClick={() => i18n.changeLanguage(l)}
          className={cn(
            'min-w-11 px-2.5 font-medium transition-colors first:rounded-l-[4px] last:rounded-r-[4px]',
            current === l ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink',
          )}
        >
          {l === 'en' ? 'EN' : 'हिं'}
        </button>
      ))}
    </div>
  );
}
