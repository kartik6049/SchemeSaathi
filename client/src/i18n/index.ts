/**
 * i18n setup (FR-13). UI strings live in en.json / hi.json; scheme content
 * comes from the API as `{ en, hi }` and is picked with `useLocalized()`.
 * The chosen language is remembered on this device and applied to <html lang>.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { storage } from '../lib/storage';
import type { Lang } from '../lib/types';
import en from './en.json';
import hi from './hi.json';

const LANG_KEY = 'ss.lang';
const saved = storage.get<Lang | null>(LANG_KEY, null);
const initial: Lang = saved ?? (typeof navigator !== 'undefined' && navigator.language?.startsWith('hi') ? 'hi' : 'en');

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, hi: { translation: hi } },
  lng: initial,
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React already escapes
  showSupportNotice: false,
});

function apply(lang: string) {
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
}
apply(initial);
i18n.on('languageChanged', (lang) => {
  storage.set(LANG_KEY, lang);
  apply(lang);
});

export default i18n;
