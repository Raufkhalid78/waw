import "./globals.css";
import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Providers } from "./providers";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";

const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-plus-jakarta" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
export const metadata: Metadata = {
  title: "Waw — Online Shopping in Pakistan | Fast Delivery & Best Prices",
  description:
    "Online Shopping in Pakistan at Waw.com.pk. Shop local products with fast nationwide delivery and verified checkout.",
  keywords:
    "online shopping pakistan, waw com pk, waw pakistan, waw online shopping, noon pakistan, fashion lawn, peshawari chappal, sialkot sports",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "Waw.com.pk — Online Shopping PK",
    description:
      "Online Shopping in Pakistan at Waw.com.pk. 24h Waw Express fast delivery nationwide.",
    url: "https://waw.com.pk",
    locale: "en_PK",
    type: "website",
  },
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
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
      </head>
      <body className="flex flex-col min-h-screen bg-slate-100/70 text-slate-950 font-sans antialiased selection:bg-amber-400 selection:text-slate-950">
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
