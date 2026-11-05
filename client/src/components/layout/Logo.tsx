/** Wordmark: a stamped seal monogram + serif name, like a civic masthead. */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export function Seal({ className = 'size-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={className}>
      <circle cx="20" cy="20" r="18.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="20" cy="20" r="14.5" fill="none" stroke="currentColor" strokeWidth="0.6" strokeDasharray="1.5 2" />
      <path d="M13 20.5l4.5 4.5L27.5 15" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="square" />
    </svg>
  );
}

export function Logo() {
  const { t } = useTranslation();
  return (
    <Link to="/" className="group flex items-center gap-2.5" aria-label={t('app.name')}>
      <Seal className="size-9 text-primary transition-transform duration-300 group-hover:rotate-[-8deg]" />
      <span className="font-serif text-[22px] font-semibold leading-none tracking-tight">{t('app.name')}</span>
    </Link>
  );
}
