"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export function ClientAuthGuard({ children, tokenKey }: { children: React.ReactNode, tokenKey: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (pathname === "/login") {
      setAuthorized(true);
      return;
    }
    
    const token = typeof window !== "undefined" ? localStorage.getItem(tokenKey) : null;
    if (!token) {
      router.push("/login");
    } else {
      setAuthorized(true);
    }
  }, [pathname, router, tokenKey]);

  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-400/20 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
