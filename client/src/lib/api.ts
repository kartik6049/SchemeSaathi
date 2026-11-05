/**
 * Typed API client. All network calls go through `request()`, which sends
 * cookies (admin session), parses JSON and throws `ApiError` on failure.
 */
import type {
  AdminField, AdminSchemeList, AdminSchemeQuery, AdminStats, AdminUser, Checklist, Evaluation, Lang, MatchResponse, MetaResponse, Profile,
  QuestionsResponse, Rule, RuleError, Scheme, SchemeDocument, SchemeInput, SearchResponse,
} from './types';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

const BASE = '/api';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(BASE + path, {
    credentials: 'same-origin',
    ...init,
    headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.error?.code ?? 'HTTP_ERROR', data?.error?.message ?? res.statusText, data?.error?.details);
  }
  return data as T;
}

const post = <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) });

/** Downloads a POST response (e.g. the checklist PDF) as a file. */
async function download(path: string, body: unknown, filename: string) {
  const res = await fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new ApiError(res.status, 'DOWNLOAD_FAILED', 'Download failed');
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function qs(params: Record<string, string | number | undefined>) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') s.set(k, String(v));
  const str = s.toString();
  return str ? `?${str}` : '';
}

export const api = {
  questions: () => request<QuestionsResponse>('/questions'),
  match: (profile: Profile, limit = 30) => post<MatchResponse>(`/match?limit=${limit}`, profile),
  searchSchemes: (p: { q?: string; category?: string; state?: string; beneficiary?: string; page?: number; limit?: number }) =>
    request<SearchResponse>(`/schemes${qs(p)}`),
  meta: () => request<MetaResponse>('/schemes/meta'),
  scheme: (slug: string) => request<Scheme>(`/schemes/${encodeURIComponent(slug)}`),
  checklist: (schemeIds: string[]) => post<Checklist>('/checklist', { schemeIds }),
  downloadChecklist: (schemeIds: string[], lang: Lang) =>
    download('/checklist/pdf', { schemeIds, lang }, `schemesaathi-checklist-${lang}.pdf`),
  event: (e: { type: string; schemeSlug?: string; step?: number }) => post<void>('/events', e),

  admin: {
    login: (email: string, password: string) => post<{ admin: AdminUser }>('/admin/auth/login', { email, password }),
    logout: () => post<void>('/admin/auth/logout', {}),
    me: () => request<{ admin: AdminUser }>('/admin/auth/me'),
    stats: () => request<AdminStats>('/admin/stats'),
    schemes: (q: AdminSchemeQuery = {}) => request<AdminSchemeList>(`/admin/schemes${qs({ ...q })}`),
    scheme: (id: number) => request<Scheme>(`/admin/schemes/${id}`),
    create: (input: SchemeInput) => post<Scheme>('/admin/schemes', input),
    update: (id: number, input: SchemeInput) => request<Scheme>(`/admin/schemes/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    setActive: (id: number, isActive: boolean) =>
      request<{ isActive: boolean }>(`/admin/schemes/${id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),
    verify: (id: number) => post<{ lastVerifiedAt: string }>(`/admin/schemes/${id}/verify`, {}),
    validateRules: (rules: Rule[]) => post<{ valid: boolean; errors: RuleError[] }>('/admin/rules/validate', { rules }),
    preview: (state: string | null, rules: Rule[], profile: Profile) => post<Evaluation>('/admin/preview', { state, rules, profile }),
    documents: () => request<{ items: SchemeDocument[] }>('/admin/documents'),
    fields: () => request<{ operators: string[]; fields: AdminField[] }>('/admin/fields'),
  },
};
