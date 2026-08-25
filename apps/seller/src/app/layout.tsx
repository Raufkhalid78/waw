import './globals.css';
import { SellerNav } from '@/components/SellerNav';

export const metadata = {
  title: 'Waw Seller Center (واو) — Pakistan Vendor Operations',
  description: 'Dedicated Seller Command Center for Waw Marketplace: Manage listings, PostEx dispatch, promotions, and payouts.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#080d1a] text-slate-100 font-sans antialiased selection:bg-amber-400 selection:text-slate-950">
        <div className="flex min-h-screen">
          <SellerNav />
          <div className="flex-1 flex flex-col min-w-0">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
