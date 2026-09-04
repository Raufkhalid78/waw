"use client";

import { Menu, Bell } from "lucide-react";

interface TopBarProps {
  onMenuToggle: () => void;
}

export function TopBar({ onMenuToggle }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3 lg:hidden">
      <button
        onClick={onMenuToggle}
        className="p-2 -ml-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-amber-400 flex items-center justify-center">
          <span className="text-sm font-black text-slate-950 leading-none">W</span>
        </div>
        <span className="text-sm font-bold text-gray-900">waw admin</span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
      </div>
    </header>
  );
}
