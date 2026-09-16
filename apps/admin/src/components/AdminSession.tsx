"use client";

import { API_BASE_URL } from "@waw/config";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type AdminRole =
  | "ADMIN"
  | "SUPER_ADMIN"
  | "FINANCE"
  | "OPS_AGENT"
  | "MODERATOR";

interface AdminSession {
  role: AdminRole | null;
  loaded: boolean;
}

const AdminSessionContext = createContext<AdminSession>({
  role: null,
  loaded: false,
});

export function useAdminSession() {
  return useContext(AdminSessionContext);
}

/**
 * Resolves the signed-in admin's role once per session and exposes it via
 * context, so the sidebar can hide modules the role cannot access.
 * Role is server-authoritative from /api/auth/session/me.
 */
export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<AdminRole | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/session/me`, {
          credentials: "include",
        });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          const r = data?.user?.role;
          if (
            r === "ADMIN" ||
            r === "SUPER_ADMIN" ||
            r === "FINANCE" ||
            r === "OPS_AGENT" ||
            r === "MODERATOR"
          ) {
            setRole(r);
          }
        }
      } catch {
        // Middleware/AuthGuard handle auth failures — role stays null
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AdminSessionContext.Provider value={{ role, loaded }}>
      {children}
    </AdminSessionContext.Provider>
  );
}
