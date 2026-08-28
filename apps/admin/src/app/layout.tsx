import "./globals.css";
import type { Metadata } from "next";
import { ClientAuthGuard } from "@/components/ClientAuthGuard";

export const metadata: Metadata = {
  title: "Waw Admin Control Center — Pakistan Marketplace Operations",
  description:
    "Enterprise control center for Waw marketplace: orders, seller KYC, inventory, PostEx logistics, and seller payouts.",
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
      <body className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-amber-400 selection:text-slate-950">
        <ClientAuthGuard tokenKey="waw_admin_token">
          {children}
        </ClientAuthGuard>
      </body>
    </html>
  );
}
