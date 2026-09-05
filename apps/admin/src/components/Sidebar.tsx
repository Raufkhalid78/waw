"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Store,
  Settings,
  LogOut,
  ChevronRight,
  Shield,
  X,
  AlertTriangle,
  RotateCcw,
  Star,
  Wallet,
  BadgeCheck,
  BarChart3,
  Sparkles,
  Zap,
  Image,
  FolderTree,
} from "lucide-react";
import clsx from "clsx";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package },
  { href: "/orders", label: "Orders", icon: ShoppingCart },
  { href: "/users", label: "Users", icon: Users },
  { href: "/stores", label: "Stores", icon: Store },
  { href: "/payouts", label: "Payouts", icon: Wallet },
  { href: "/disputes", label: "Disputes", icon: AlertTriangle },
  { href: "/returns", label: "Returns", icon: RotateCcw },
  { href: "/reviews", label: "Reviews", icon: Star },
  { href: "/kyc", label: "KYC", icon: BadgeCheck },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/ai", label: "AI Usage", icon: Sparkles },
  { href: "/flash-sales", label: "Flash Sales", icon: Zap },
  { href: "/banners", label: "Banners", icon: Image },
  { href: "/categories", label: "Categories", icon: FolderTree },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/session/revoke", {
        method: "POST",
        credentials: "include",
      });
    } catch {}
    // Clear the admin token cookie
    document.cookie = "waw_admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    window.location.href = "/login";
  };

  const navContent = (
    <>
      {/* Logo */}
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5" onClick={onClose}>
          <div className="w-9 h-9 rounded-xl bg-amber-400 flex items-center justify-center shadow-sm">
            <span className="text-xl font-black text-slate-950 leading-none">W</span>
          </div>
          <div>
            <span className="text-lg font-black text-slate-950 tracking-tight">waw</span>
            <span className="block text-[10px] font-bold text-slate-400 tracking-widest uppercase -mt-0.5">
              admin
            </span>
          </div>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-amber-400 text-slate-950 shadow-sm"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
              {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400">
          <Shield className="w-3.5 h-3.5" />
          <span>Admin Panel v1.0</span>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors mt-0.5"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 bg-white border-r border-gray-200 flex-col h-screen shrink-0">
        {navContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
            style={{ animation: "overlayIn 200ms ease-out" }}
          />
          <aside
            className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col"
            style={{ animation: "slideInLeft 250ms ease-out" }}
          >
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
