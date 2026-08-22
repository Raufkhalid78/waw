import './globals.css';
import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Waw — Online Shopping in Pakistan | Fast Delivery & Best Prices',
  description:
    'Online Shopping in Pakistan at Waw.com.pk. Shop 50,000+ products with 24h Waw Express delivery and 100% State Bank Escrow buyer protection.',
  keywords: 'online shopping pakistan, waw com pk, waw pakistan, waw online shopping, noon pakistan, fashion lawn, peshawari chappal, sialkot sports',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    title: 'Waw.com.pk — Online Shopping PK',
    description: 'Online Shopping in Pakistan at Waw.com.pk. 24h Waw Express fast delivery nationwide.',
    url: 'https://waw.com.pk',
    locale: 'en_PK',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FEF600" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
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
