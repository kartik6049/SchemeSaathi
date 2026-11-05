/**
 * Masthead: a thin dateline strip, then wordmark + navigation + language and
 * theme controls. On small screens navigation collapses into a sheet.
 */
import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router-dom';
import { useLocalized } from '../../i18n/useLocalized';
import { cn } from '../../lib/cn';
import { LanguageToggle } from './LanguageToggle';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

const LINKS = [
  { to: '/check', key: 'nav.check' },
  { to: '/schemes', key: 'nav.browse' },
  { to: '/privacy', key: 'nav.privacy' },
];

export function Header() {
  const { t } = useTranslation();
  const { lang } = useLocalized();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const today = new Date().toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'relative py-1 text-[15px] transition-colors after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:origin-left after:bg-accent after:transition-transform',
      isActive ? 'text-ink after:scale-x-100' : 'text-ink-2 after:scale-x-0 hover:text-ink hover:after:scale-x-100',
    );

  return (
    <header className="no-print relative z-40 bg-paper/90 backdrop-blur-sm">
      <div className="border-b border-rule">
        <div className="mx-auto flex h-8 max-w-6xl items-center justify-between px-4 sm:px-6">
          <span className="kicker">{today}</span>
          <span className="kicker hidden sm:inline">{t('app.tagline')}</span>
        </div>
      </div>
      <div className="border-b-2 border-rule-strong">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-7 md:flex" aria-label="Main">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className={linkClass}>
                {t(l.key)}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-1.5">
            <LanguageToggle />
            <ThemeToggle />
            <button
              type="button"
              className="inline-flex size-10 items-center justify-center rounded-md hover:bg-surface-2 md:hidden"
              aria-label={t('nav.menu')}
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </div>
      {open && (
        <nav className="animate-fade border-b border-rule bg-paper px-4 py-2 md:hidden" aria-label="Mobile">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => cn('flex min-h-12 items-center border-b border-rule font-serif text-xl last:border-0', isActive ? 'text-primary' : 'text-ink')}>
              {t(l.key)}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
