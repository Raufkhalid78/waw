import './globals.css';
import Link from 'next/link';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Tag,
  CreditCard,
  FileSpreadsheet,
  ExternalLink,
  Store,
  ShieldCheck,
  Truck,
  Bell,
  Sparkles,
} from 'lucide-react';

export const metadata = {
  title: 'Waw Seller Center (واو) — Pakistan Vendor Operations',
  description: 'Dedicated Seller Command Center for Waw Marketplace: Manage listings, PostEx dispatch, promotions, and SBP escrow payouts.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#080d1a] text-slate-100 font-sans antialiased selection:bg-amber-400 selection:text-slate-950">
        <div className="flex min-h-screen">
          {/* ── Desktop Sidebar ────────────────────────────────────────── */}
          <aside className="hidden lg:flex w-64 flex-col bg-[#0f172a] border-r border-slate-800/80 sticky top-0 h-screen z-30">
            {/* Brand & Store Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-amber-500/20">
                  واو
                </div>
                <div>
                  <div className="text-xs font-black text-white tracking-tight flex items-center gap-1.5">
                    WAW SELLER
                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-400/10 text-amber-400 rounded border border-amber-400/20">PORTAL</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium truncate max-w-[130px]">Lahore Silk Studio</div>
                </div>
              </div>
            </div>

            {/* Store Verification Badge */}
            <div className="mx-4 my-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-[11px] text-emerald-400 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>SECP Verified • 10% Take</span>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 px-3 py-2 space-y-1 text-xs font-semibold">
              <Link
                href="/"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all group"
              >
                <LayoutDashboard className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <span>Dashboard Overview</span>
              </Link>

              <Link
                href="/orders"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all group"
              >
                <ShoppingBag className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span>Store Orders</span>
                <span className="ml-auto bg-amber-400/20 text-amber-300 text-[10px] px-1.5 py-0.5 rounded-full font-bold">Live</span>
              </Link>

              <Link
                href="/products"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all group"
              >
                <Package className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                <span>Catalog & Inventory</span>
              </Link>

              <Link
                href="/products/bulk-upload"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all group"
              >
                <FileSpreadsheet className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                <span>CSV Bulk Import</span>
              </Link>

              <Link
                href="/coupons"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all group"
              >
                <Tag className="w-4 h-4 text-pink-400 group-hover:scale-110 transition-transform" />
                <span>Seller Coupons</span>
              </Link>

              <Link
                href="/payouts"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all group"
              >
                <CreditCard className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                <span>SBP Escrow Payouts</span>
              </Link>
            </nav>

            {/* Courier Integration Status */}
            <div className="p-4 m-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-amber-400" /> PostEx Direct API</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <p className="text-[10px] text-slate-400">Auto-manifesting CN airway bills on order confirmation.</p>
            </div>

            {/* Bottom Buyer Store Link */}
            <div className="p-3 border-t border-slate-800">
              <a
                href="https://waw.com.pk"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/40 hover:bg-slate-800 text-[11px] text-slate-400 hover:text-white transition-colors"
              >
                <span>View Buyer Storefront</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </aside>

          {/* ── Main Content Area ──────────────────────────────────────── */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Topbar */}
            <header className="h-16 bg-[#0f172a]/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-20 px-4 sm:px-8 flex items-center justify-between">
              {/* Mobile Branding */}
              <div className="flex items-center gap-2 lg:hidden">
                <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center font-black text-slate-950 text-sm">
                  واو
                </div>
                <span className="font-bold text-sm tracking-tight text-white">Seller Portal</span>
              </div>

              {/* Status Header */}
              <div className="hidden lg:flex items-center gap-3 text-xs">
                <span className="text-slate-400">Store Status:</span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                  ● ACTIVE ON WAW.COM.PK
                </span>
              </div>

              {/* Right Profile / Quick Action */}
              <div className="flex items-center gap-4">
                <Link
                  href="/products"
                  className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  + Add Product
                </Link>
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-amber-400">
                  LS
                </div>
              </div>
            </header>

            {/* Mobile Nav Bar */}
            <div className="lg:hidden flex items-center justify-around bg-slate-900 border-b border-slate-800 py-2.5 px-2 text-[10px] font-semibold text-slate-400 overflow-x-auto">
              <Link href="/" className="px-2 py-1 hover:text-white">Dashboard</Link>
              <Link href="/orders" className="px-2 py-1 hover:text-white">Orders</Link>
              <Link href="/products" className="px-2 py-1 hover:text-white">Products</Link>
              <Link href="/products/bulk-upload" className="px-2 py-1 hover:text-white">Bulk CSV</Link>
              <Link href="/coupons" className="px-2 py-1 hover:text-white">Coupons</Link>
              <Link href="/payouts" className="px-2 py-1 hover:text-white">Payouts</Link>
            </div>

            {/* Page Body */}
            <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
