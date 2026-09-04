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
  BarChart3,
  Settings,
  Menu,
  X,
  Sparkles,
} from "lucide-react";

export function SellerNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [storeName, setStoreName] = useState("My Store");
  const [city, setCity] = useState("Pakistan");
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("waw_seller_token");
    localStorage.removeItem("waw_store_id");
    localStorage.removeItem("waw_seller_user");
    router.push("/login");
  };

  if (pathname === "/login") {
    return null;
  }

  const navLinks = [
    { href: "/", label: "Dashboard Overview", icon: LayoutDashboard, color: "text-amber-400" },
    { href: "/orders", label: "Store Orders", icon: ShoppingBag, color: "text-emerald-400", badge: "Live" },
    { href: "/products", label: "Catalog & Inventory", icon: Package, color: "text-blue-400" },
    { href: "/products/bulk-upload", label: "CSV Bulk Import", icon: FileSpreadsheet, color: "text-purple-400" },
    { href: "/ai/describe", label: "AI Description", icon: Sparkles, color: "text-amber-300" },
    { href: "/coupons", label: "Seller Coupons", icon: Tag, color: "text-pink-400" },
    { href: "/payouts", label: "Weekly Payouts", icon: CreditCard, color: "text-amber-500" },
    { href: "/analytics", label: "Analytics", icon: BarChart3, color: "text-cyan-400" },
    { href: "/settings", label: "Store Settings", icon: Settings, color: "text-slate-300" },
  ];

  const navContent = (
    <>
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
        <button
          onClick={() => setMobileOpen(false)}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 lg:hidden"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Store Verification Badge */}
      <div className="mx-4 my-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-[11px] text-emerald-400 font-semibold">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>Verified Merchant • {city}</span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-1 text-xs font-semibold">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
              pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href))
                ? "bg-amber-400/10 text-amber-400 border border-amber-400/20"
                : "text-slate-300 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <link.icon className={`w-4 h-4 ${link.color}`} />
            <span>{link.label}</span>
            {link.badge && (
              <span className="ml-auto bg-amber-400/20 text-amber-300 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {link.badge}
              </span>
            )}
          </Link>
        ))}
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
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 rounded-xl bg-[#0f172a] text-white shadow-lg lg:hidden"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-[#0f172a] border-r border-slate-800/80 sticky top-0 h-screen z-30">
        {navContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-[#0f172a] shadow-2xl flex flex-col">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
