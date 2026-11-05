// NFR-11: every UI string must exist in both languages.
import { describe, expect, it } from 'vitest';
import en from './en.json';
import hi from './hi.json';

function keys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => (typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
}

describe('translations', () => {
  it('have identical keys in English and Hindi', () => {
    expect(keys(hi).sort()).toEqual(keys(en).sort());
  });

  it('have no empty strings', () => {
    const empties = (o: object) => keys(o).filter((k) => k.split('.').reduce((acc: never, p) => acc[p], o as never) === '');
    expect(empties(en)).toEqual([]);
    expect(empties(hi)).toEqual([]);
  });

  it('keep the same interpolation variables', () => {
    const vars = (s: string) => (s.match(/{{\s*\w+\s*}}/g) ?? []).sort();
    const get = (o: object, k: string) => k.split('.').reduce((acc: never, p) => acc[p], o as never) as string;
    for (const k of keys(en)) expect(vars(get(hi, k)), k).toEqual(vars(get(en, k)));
  });
});
