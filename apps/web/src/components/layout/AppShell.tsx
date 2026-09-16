"use client";

import { useEffect, useState } from "react";
import { MobileBottomNav } from "./MobileBottomNav";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { AiChatWidget } from "@/components/ai/AiChatWidget";
import { useCartStore } from "@/store/useCartStore";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  // Bootstrap the guest cart on first mount: without this the store writes
  // items to /api/cart but never loads them back — a page refresh emptied
  // the cart badge, drawer and /cart page while the server still had them.
  const initGuestCart = useCartStore((s) => s.initGuestCart);
  const login = useCartStore((s) => s.login);
  const user = useCartStore((s) => s.user);

  useEffect(() => {
    initGuestCart().catch(() => {});
  }, [initGuestCart]);

  // Session bootstrap: `user` lived only in unpersisted Zustand, so a page
  // refresh showed "Hi, Sign In" in the header while /account rendered the
  // logged-in profile. Hydrate from the server session on every mount.
  useEffect(() => {
    if (user) return;
    let alive = true;
    import("@/lib/api").then(async ({ fetchSessionUser }) => {
      try {
        const sessionUser = await fetchSessionUser();
        if (alive && sessionUser) {
          login({
            name: sessionUser.name || sessionUser.phone || "Waw Customer",
            emailOrPhone: sessionUser.email || sessionUser.phone || "",
          });
        }
      } catch {
        // Not signed in — guest header is correct.
      }
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Header onMenuToggle={() => setMenuOpen(!menuOpen)} menuOpen={menuOpen} />
      <main className="flex-1 pb-16 lg:pb-0">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
      <Footer />
      <AiChatWidget />
      <MobileBottomNav onMenuOpen={() => setMenuOpen(!menuOpen)} />
    </>
  );
}
