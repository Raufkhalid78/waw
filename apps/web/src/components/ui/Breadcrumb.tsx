"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className = "" }: BreadcrumbProps) {
  return (
    <nav className={`flex items-center gap-1.5 text-xs font-semibold text-slate-500 ${className}`}>
      <Link href="/" className="hover:text-amber-600 transition-colors">
        Home
      </Link>
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1.5">
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          {item.href ? (
            <Link href={item.href} className="hover:text-amber-600 transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-900 font-bold truncate max-w-[200px]">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
