/** Date helpers shared by scheme cards and detail pages. */
import type { Lang } from './types';

export function formatDate(iso: string, lang: Lang): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${iso}T00:00:00`).getTime() - today.getTime()) / 86_400_000);
}
