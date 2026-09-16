"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type AuthState = "checking" | "authorized" | "redirecting";

export function ClientAuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [authState, setAuthState] = useState<AuthState>("checking");

  useEffect(() => {
    // Login page is always accessible
    if (pathname === "/login") {
      setAuthState("authorized");
      return;
    }

    // waw_session is httpOnly — it can never be read from document.cookie.
    // Ask via the same-origin proxy (which reads the cookie server-side).
    // A direct cross-origin fetch to api.waw.com.pk would strip the
    // SameSite=Strict cookie and always return 401.
    let cancelled = false;
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/session/me");
        if (cancelled) return;
        if (res.ok) {
          setAuthState("authorized");
        } else {
          setAuthState("redirecting");
          router.replace("/login");
        }
      } catch {
        if (!cancelled) {
          setAuthState("redirecting");
          router.replace("/login");
        }
      }
    }
    checkSession();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (authState === "checking" || authState === "redirecting") {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        {authState === "redirecting" ? (
          <>
            <div className="w-10 h-10 border-4 border-amber-400/20 border-t-amber-400 rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Redirecting to login...</p>
            <a
              href="/login"
              className="text-amber-400 text-xs underline underline-offset-2"
            >
              Click here if not redirected
            </a>
          </>
        ) : (
          <div className="w-8 h-8 border-4 border-amber-400/20 border-t-amber-400 rounded-full animate-spin" />
        )}
      </div>
    );
  }

  return <>{children}</>;
}
