/**
 * Shared bilingual helpers. Every user-facing string on the server is a
 * `Localized` pair so the API can answer in either language (FR-13).
 */
export type Lang = 'en' | 'hi';
export interface Localized {
  en: string;
  hi: string;
}

export const LANGS: readonly Lang[] = ['en', 'hi'];

export function parseLang(value: unknown): Lang {
  return value === 'hi' ? 'hi' : 'en';
}
