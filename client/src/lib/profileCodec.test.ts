import { describe, expect, it } from 'vitest';
import { decodeProfile, encodeProfile } from './profileCodec';

describe('profile codec', () => {
  it('round-trips profiles including Unicode', () => {
    const p = { state: 'UP', age: 62, disability: false, note: 'किसान' };
    expect(decodeProfile(encodeProfile(p))).toEqual(p);
  });

  it('drops undefined and empty values', () => {
    expect(decodeProfile(encodeProfile({ a: undefined, b: '', c: 1 }))).toEqual({ c: 1 });
  });

  it('produces URL-safe output', () => {
    expect(encodeProfile({ x: '???>>>' })).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('returns null for garbage', () => {
    expect(decodeProfile(null)).toBeNull();
    expect(decodeProfile('%%%')).toBeNull();
    expect(decodeProfile(btoa('[1,2]'))).toBeNull();
  });
});
