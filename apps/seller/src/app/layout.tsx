import "./globals.css";
import type { Metadata } from "next";
import { SellerNav } from "@/components/SellerNav";
import { ClientAuthGuard } from "@/components/ClientAuthGuard";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "Waw Seller Center (واو) — Pakistan Vendor Operations",
  description:
    "Dedicated Seller Command Center for Waw Marketplace: Manage listings, PostEx dispatch, promotions, and payouts.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body className="min-h-screen bg-[#080d1a] text-slate-100 font-sans antialiased selection:bg-amber-400 selection:text-slate-950">
        <ErrorBoundary>
          <ClientAuthGuard tokenKey="waw_seller_token">
            <div className="flex min-h-screen">
              <SellerNav />
              <div className="flex-1 flex flex-col min-w-0">{children}</div>
            </div>
          </ClientAuthGuard>
        </ErrorBoundary>
      </body>
    </html>
  );
}
