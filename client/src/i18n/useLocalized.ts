/**
 * Hook returning the current language and a picker for `{ en, hi }` objects:
 *   const { lang, l, untranslated } = useLocalized();  l(scheme.name)
 * Imported schemes are English-only for now; `l()` falls back to English and
 * `untranslated(text)` tells the UI to show a "Hindi pending" note.
 */
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Lang, Localized } from '../lib/types';

export function useLocalized() {
  const { i18n } = useTranslation();
  const lang: Lang = i18n.language === 'hi' ? 'hi' : 'en';
  const l = useCallback((text: Localized | undefined | null) => (text ? text[lang] || text.en : ''), [lang]);
  const untranslated = useCallback((text: Localized | undefined | null) => lang === 'hi' && Boolean(text?.en) && !text?.hi, [lang]);
  return { lang, l, untranslated };
}
