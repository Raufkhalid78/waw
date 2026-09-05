import "./globals.css";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import { Providers } from "./providers";
import { AppShell } from "@/components/layout/AppShell";

const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-plus-jakarta" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
export const metadata: Metadata = {
  title: {
    default: "Waw — Premium Marketplace Pakistan",
    template: "%s | Waw — Premium Marketplace Pakistan",
  },
  description:
    "Pakistan's premium online marketplace. Shop verified local products with fast nationwide delivery and secure checkout.",
  keywords:
    "online shopping pakistan, waw com pk, waw pakistan, waw online shopping, noon pakistan, fashion lawn, peshawari chappal, sialkot sports",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    title: "Waw — Premium Marketplace Pakistan",
    description:
      "Pakistan's premium online marketplace. Shop verified local products with fast nationwide delivery.",
    url: "https://waw.com.pk",
    siteName: "Waw",
    locale: "en_PK",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Waw — Premium Marketplace Pakistan",
    description: "Pakistan's premium online marketplace. Verified products, fast delivery.",
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://waw.com.pk"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr" className={`${plusJakarta.variable} ${inter.variable}`}>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FEF600" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
      </head>
      <body className="flex flex-col min-h-screen bg-slate-100/70 text-slate-950 font-sans antialiased selection:bg-amber-400 selection:text-slate-950">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
