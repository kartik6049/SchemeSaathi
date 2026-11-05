/** Admin sign-in (FR-16). Errors are generic by design (no user enumeration). */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '../../components/layout/Logo';
import { Button } from '../../components/ui/Button';
import { FormField, Input } from '../../components/ui/Field';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { ApiError } from '../../lib/api';

export function AdminLoginPage() {
  const { t } = useTranslation();
  const { admin, login } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (admin) return <Navigate to="/admin" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate((location.state as { from?: string } | null)?.from ?? '/admin', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_480px]">
      <div className="hidden flex-col justify-between border-r border-rule p-12 lg:flex">
        <Logo />
        <p className="max-w-lg font-serif text-5xl leading-[1.05] tracking-tight">{t('admin.loginSubtitle')}</p>
        <p className="kicker">{t('admin.title')}</p>
      </div>
      <div className="flex items-center justify-center px-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div className="lg:hidden">
            <Logo />
          </div>
          <h1 className="font-serif text-3xl tracking-tight">{t('admin.loginTitle')}</h1>
          <FormField label={t('admin.email')}>
            {(p) => <Input {...p} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />}
          </FormField>
          <FormField label={t('admin.password')}>
            {(p) => <Input {...p} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />}
          </FormField>
          {error && (
            <p role="alert" className="border-l-2 border-bad pl-3 text-sm text-bad">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            {busy ? t('admin.signingIn') : t('admin.signIn')}
          </Button>
        </form>
      </div>
    </div>
  );
}
