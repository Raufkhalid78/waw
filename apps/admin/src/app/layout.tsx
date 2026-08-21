import './globals.css';
import Link from 'next/link';
import { LayoutDashboard, Users, Package, ShoppingBag, Banknote, ShieldAlert, Settings, Sparkles } from 'lucide-react';

export const metadata = {
  title: 'Waw Admin Control Center — Pakistan Operations',
  description: 'Manage sellers, orders, 1P inventory, and finances on Waw marketplace.',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex bg-slate-950 text-slate-100 font-sans antialiased">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col justify-between shrink-0 hidden md:flex">
          <div className="space-y-8">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center text-white font-black text-lg shadow-md shadow-sky-500/20">
                و
              </div>
              <div>
                <div className="font-extrabold text-base tracking-tight text-white leading-none">
                  Waw<span className="text-sky-400">Admin</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">Control Center PK</div>
              </div>
            </Link>

            <nav className="space-y-1 text-xs font-semibold">
              <Link
                href="/"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Executive Overview</span>
              </Link>

              <Link
                href="/"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
              >
                <Users className="w-4 h-4" />
                <span>Sellers KYC & Commission</span>
              </Link>

              <Link
                href="/"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
              >
                <Package className="w-4 h-4" />
                <span>1P Direct Inventory</span>
              </Link>

              <Link
                href="/"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Orders & Fulfillment</span>
              </Link>

              <Link
                href="/"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
              >
                <Banknote className="w-4 h-4" />
                <span>COD & Courier Remittance</span>
              </Link>

              <Link
                href="/"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Vendor Payout Queue</span>
              </Link>
            </nav>
          </div>

          <div className="p-3 bg-slate-800/50 rounded-2xl border border-slate-700/50 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center justify-between text-white font-bold">
              <span>Waw Engine v1.0</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div>Free Delivery: &gt;Rs. 5k</div>
            <div>COD Fee: +Rs. 100</div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur px-8 flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              <span>Production Cluster — Islamabad / Karachi Nodes</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full border border-slate-700">
                🇵🇰 Currency: PKR
              </span>
              <div className="w-8 h-8 rounded-full bg-sky-500 text-white font-bold flex items-center justify-center text-xs">
                AD
              </div>
            </div>
          </header>

          <main className="p-8 flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
