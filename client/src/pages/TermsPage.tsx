/** Simple terms of use for the beta, set as a numbered article like the privacy notice. */
import { useTranslation } from 'react-i18next';

export function TermsPage() {
  const { t } = useTranslation();
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <p className="kicker">{t('nav.terms')}</p>
      <h1 className="mt-3 font-serif text-5xl tracking-tight">{t('terms.title')}</h1>
      <p className="mt-5 font-serif text-xl italic leading-snug text-ink-2">{t('terms.intro')}</p>
      <div className="mt-10 border-t-2 border-rule-strong">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <section key={n} className="grid gap-2 border-b border-rule py-6 sm:grid-cols-[48px_1fr]">
            <span className="num font-serif text-2xl text-accent">{n}</span>
            <div>
              <h2 className="font-serif text-2xl tracking-tight">{t(`terms.h${n}`)}</h2>
              <p className="mt-2 leading-relaxed text-ink-2">{t(`terms.p${n}`)}</p>
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
