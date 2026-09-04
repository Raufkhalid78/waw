"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Grid3X3, ShoppingCart, User, Menu } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import clsx from "clsx";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/categories", label: "Categories", icon: Grid3X3 },
  { href: "/cart", label: "Cart", icon: ShoppingCart, showBadge: true },
  { href: "/account", label: "Account", icon: User },
];

interface MobileBottomNavProps {
  onMenuOpen?: () => void;
}

export function MobileBottomNav({ onMenuOpen }: MobileBottomNavProps) {
  const pathname = usePathname();
  const items = useCartStore((s) => s.items);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-bottom lg:hidden">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const cartCount = item.showBadge ? items.length : 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex flex-col items-center justify-center w-full h-full gap-0.5 transition-colors",
                isActive ? "text-amber-600" : "text-gray-500"
              )}
            >
              <div className="relative">
                <item.icon
                  className={clsx(
                    "w-5 h-5 transition-transform",
                    isActive && "scale-110"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                    {cartCount}
                  </span>
                )}
              </div>
              <span
                className={clsx(
                  "text-[10px] font-medium",
                  isActive && "font-semibold"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Menu button */}
        <button
          onClick={onMenuOpen}
          className="flex flex-col items-center justify-center w-full h-full gap-0.5 text-gray-500 active:text-amber-600 transition-colors"
        >
          <Menu className="w-5 h-5" strokeWidth={2} />
          <span className="text-[10px] font-medium">Menu</span>
        </button>
      </div>
    </nav>
  );
}
