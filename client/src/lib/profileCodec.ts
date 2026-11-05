/**
 * Encodes a profile into a compact URL-safe string for the results URL
 * (`/results?p=...`). This keeps matching stateless on the server and makes
 * results shareable (FR-12) without storing anything.
 */
import type { Profile } from './types';

export function encodeProfile(profile: Profile): string {
  const clean = Object.fromEntries(Object.entries(profile).filter(([, v]) => v !== undefined && v !== ''));
  const bytes = new TextEncoder().encode(JSON.stringify(clean));
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeProfile(encoded: string | null): Profile | null {
  if (!encoded) return null;
  try {
    const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
    const json = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Profile) : null;
  } catch {
    return null;
  }
}
