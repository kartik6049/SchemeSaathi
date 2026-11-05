/** Colophon-style footer: disclaimer, source attribution, links. */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Seal } from './Logo';

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="no-print mt-24 border-t-2 border-rule-strong">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_auto]">
        <div className="flex gap-4">
          <Seal className="size-10 shrink-0 text-ink-3" />
          <div className="space-y-2">
            <p className="font-serif text-lg">{t('app.name')}</p>
            <p className="max-w-md text-sm text-ink-2">{t('footer.disclaimer')}</p>
          </div>
        </div>
        <p className="text-sm text-ink-2">
          <span className="kicker block pb-1">{t('footer.sourcesTitle')}</span>
          {t('footer.sources')}{' '}
          <a className="link" href="https://www.myscheme.gov.in" target="_blank" rel="noopener noreferrer">
            myScheme
          </a>
        </p>
        <nav className="flex flex-col gap-1.5 text-sm" aria-label="Footer">
          <Link className="link w-fit" to="/check">{t('nav.check')}</Link>
          <Link className="link w-fit" to="/schemes">{t('nav.browse')}</Link>
          <Link className="link w-fit" to="/privacy">{t('nav.privacy')}</Link>
          <Link className="link w-fit" to="/terms">{t('nav.terms')}</Link>
          <Link className="link w-fit" to="/admin">{t('nav.admin')}</Link>
        </nav>
      </div>
    </footer>
  );
}
