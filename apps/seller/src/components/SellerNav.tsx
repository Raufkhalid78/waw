"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  FileSpreadsheet,
  Tag,
  CreditCard,
  Truck,
  ShieldCheck,
  LogOut,
} from "lucide-react";

export function SellerNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [storeName, setStoreName] = useState("My Store");
  const [city, setCity] = useState("Pakistan");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (pathname === "/login") return;

    const token = localStorage.getItem("waw_seller_token");
    if (!token) {
      router.push("/login");
      return;
    }

    const userRaw = localStorage.getItem("waw_seller_user");
    if (userRaw) {
      try {
        const u = JSON.parse(userRaw);
        if (u.storeName) setStoreName(u.storeName);
        if (u.city) setCity(u.city);
      } catch (e) {}
    }
  }, [pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem("waw_seller_token");
    localStorage.removeItem("waw_store_id");
    localStorage.removeItem("waw_seller_user");
    router.push("/login");
  };

  if (pathname === "/login") {
    return null;
  }

  return (
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
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-400/10 text-amber-400 rounded border border-amber-400/20">
                PORTAL
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium truncate max-w-[130px]">
              {storeName}
            </div>
          </div>
        </div>
      </div>

      {/* Store Verification Badge */}
      <div className="mx-4 my-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-[11px] text-emerald-400 font-semibold">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>Verified Merchant • {city}</span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-1 text-xs font-semibold">
        <Link
          href="/"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
            pathname === "/"
              ? "bg-amber-400/10 text-amber-400 border border-amber-400/20"
              : "text-slate-300 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <LayoutDashboard className="w-4 h-4 text-amber-400" />
          <span>Dashboard Overview</span>
        </Link>

        <Link
          href="/orders"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
            pathname === "/orders"
              ? "bg-amber-400/10 text-amber-400 border border-amber-400/20"
              : "text-slate-300 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <ShoppingBag className="w-4 h-4 text-emerald-400" />
          <span>Store Orders</span>
          <span className="ml-auto bg-amber-400/20 text-amber-300 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
            Live
          </span>
        </Link>

        <Link
          href="/products"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
            pathname === "/products"
              ? "bg-amber-400/10 text-amber-400 border border-amber-400/20"
              : "text-slate-300 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <Package className="w-4 h-4 text-blue-400" />
          <span>Catalog & Inventory</span>
        </Link>

        <Link
          href="/products/bulk-upload"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
            pathname === "/products/bulk-upload"
              ? "bg-amber-400/10 text-amber-400 border border-amber-400/20"
              : "text-slate-300 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-purple-400" />
          <span>CSV Bulk Import</span>
        </Link>

        <Link
          href="/coupons"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
            pathname === "/coupons"
              ? "bg-amber-400/10 text-amber-400 border border-amber-400/20"
              : "text-slate-300 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <Tag className="w-4 h-4 text-pink-400" />
          <span>Seller Coupons</span>
        </Link>

        <Link
          href="/payouts"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
            pathname === "/payouts"
              ? "bg-amber-400/10 text-amber-400 border border-amber-400/20"
              : "text-slate-300 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <CreditCard className="w-4 h-4 text-amber-500" />
          <span>Weekly Payouts</span>
        </Link>
      </nav>

      {/* Courier Integration Status */}
      <div className="p-4 m-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] space-y-2">
        <div className="flex items-center justify-between text-slate-400">
          <span className="flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-amber-400" /> Courier Service
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        </div>
        <p className="text-[10px] text-slate-400">
          Auto-manifesting PostEx & Trax airway bills on order confirmation.
        </p>
      </div>

      {/* Bottom Sign Out Link */}
      <div className="p-3 border-t border-slate-800">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-950 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
