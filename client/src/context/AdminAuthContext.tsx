/**
 * Admin session state. The session itself is an httpOnly cookie the
 * browser manages; this context only knows *who* is logged in (via /me).
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import type { AdminUser } from '../lib/types';

interface AdminAuth {
  admin: AdminUser | null;
  checking: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AdminAuth | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api.admin
      .me()
      .then((r) => setAdmin(r.admin))
      .catch(() => setAdmin(null))
      .finally(() => setChecking(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await api.admin.login(email, password);
    setAdmin(r.admin);
  }, []);

  const logout = useCallback(async () => {
    await api.admin.logout().catch(() => {});
    setAdmin(null);
  }, []);

  return <Ctx.Provider value={{ admin, checking, login, logout }}>{children}</Ctx.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAdminAuth must be used inside <AdminAuthProvider>');
  return ctx;
}
