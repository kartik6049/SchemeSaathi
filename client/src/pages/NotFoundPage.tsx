import { useTranslation } from 'react-i18next';
import { ButtonLink } from '../components/ui/Button';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6">
      <p className="num font-serif text-[120px] leading-none text-rule">404</p>
      <h1 className="mt-4 font-serif text-4xl tracking-tight">{t('common.notFoundTitle')}</h1>
      <p className="mt-3 text-ink-2">{t('common.notFoundBody')}</p>
      <ButtonLink to="/" className="mt-8">
        {t('common.goHome')}
      </ButtonLink>
    </div>
  );
}
