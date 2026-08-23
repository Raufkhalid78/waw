import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'Waw Admin & Seller Control Center — Pakistan Marketplace Operations',
  description: 'Enterprise control center for Waw marketplace: orders, sellers KYC, inventory, PostEx logistics, and SBP escrow payouts.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-amber-400 selection:text-slate-950">
        {children}
      </body>
    </html>
  );
}
