"use client";

import { useState } from "react";
import { MobileBottomNav } from "./MobileBottomNav";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Providers } from "@/app/providers";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Providers>
      <Header onMenuToggle={() => setMenuOpen(!menuOpen)} menuOpen={menuOpen} />
      <main className="flex-1 pb-16 lg:pb-0">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
      <Footer />
      <MobileBottomNav onMenuOpen={() => setMenuOpen(!menuOpen)} />
    </Providers>
  );
}
