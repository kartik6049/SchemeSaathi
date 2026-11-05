/**
 * Admin shell: guards every /admin/* route (redirects to login without a
 * session) and renders the admin masthead + navigation.
 */
import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { LanguageToggle } from '../../components/layout/LanguageToggle';
import { Logo } from '../../components/layout/Logo';
import { ThemeToggle } from '../../components/layout/ThemeToggle';
import { LoadingState } from '../../components/ui/States';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { cn } from '../../lib/cn';

export function AdminLayout() {
  const { t } = useTranslation();
  const { admin, checking, logout } = useAdminAuth();
  const location = useLocation();

  if (checking) return <LoadingState />;
  if (!admin) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;

  const link = ({ isActive }: { isActive: boolean }) =>
    cn('-mb-0.5 flex min-h-12 items-center border-b-2 px-1 text-[15px] transition-colors', isActive ? 'border-accent text-ink' : 'border-transparent text-ink-3 hover:text-ink');

  return (
    <div className="min-h-dvh">
      <header className="border-b-2 border-rule-strong">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-2 px-4 pt-3 sm:px-6">
          <div className="flex items-center gap-3 py-2">
            <Logo />
            <span className="kicker border-l border-rule pl-3">{t('admin.title')}</span>
          </div>
          <nav className="order-last flex w-full gap-6 overflow-x-auto sm:order-none sm:w-auto" aria-label="Admin">
            <NavLink end to="/admin" className={link}>{t('admin.dashboard')}</NavLink>
            <NavLink end to="/admin/schemes" className={link}>{t('admin.schemes')}</NavLink>
            <NavLink to="/admin/schemes/new" className={link}>{t('admin.newScheme')}</NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-1.5 py-2">
            <span className="hidden text-sm text-ink-3 lg:inline">{admin.email}</span>
            <LanguageToggle />
            <ThemeToggle />
            <button type="button" onClick={logout} aria-label={t('admin.signOut')} className="inline-flex size-10 items-center justify-center rounded-md text-ink-2 hover:bg-surface-2 hover:text-ink">
              <LogOut className="size-[18px]" />
            </button>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
