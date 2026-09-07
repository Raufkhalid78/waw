'use client';

import { Badge } from '@/lib/api';
import { Flame, Zap, Tag, Sparkles } from 'lucide-react';

const badgeStyles: Record<string, { bg: string; text: string; icon: React.ReactNode; darkBg: string; darkText: string }> = {
  best_seller: {
    bg: 'bg-gradient-to-r from-amber-500 to-orange-500',
    text: 'text-white',
    icon: <Flame className="w-2.5 h-2.5" />,
    darkBg: 'dark:from-amber-600 dark:to-orange-600',
    darkText: 'dark:text-white',
  },
  waw_deal_1: {
    bg: 'bg-blue-500',
    text: 'text-white',
    icon: <Tag className="w-2.5 h-2.5" />,
    darkBg: 'dark:bg-blue-600',
    darkText: 'dark:text-white',
  },
  waw_deal_2: {
    bg: 'bg-amber-500',
    text: 'text-slate-900',
    icon: <Zap className="w-2.5 h-2.5" />,
    darkBg: 'dark:bg-amber-600',
    darkText: 'dark:text-slate-900',
  },
  waw_deal_3: {
    bg: 'bg-red-500',
    text: 'text-white',
    icon: <Flame className="w-2.5 h-2.5" />,
    darkBg: 'dark:bg-red-600',
    darkText: 'dark:text-white',
  },
  new_arrival: {
    bg: 'bg-emerald-500',
    text: 'text-white',
    icon: <Sparkles className="w-2.5 h-2.5" />,
    darkBg: 'dark:bg-emerald-600',
    darkText: 'dark:text-white',
  },
};

function getStyleKey(badge: Badge): string {
  if (badge.type === 'waw_deal') return `waw_deal_${badge.tier || 1}`;
  return badge.type;
}

export function ProductBadge({ badge, size = 'md' }: { badge: Badge; size?: 'sm' | 'md' }) {
  const style = badgeStyles[getStyleKey(badge)] || badgeStyles.waw_deal_1;
  const isSm = size === 'sm';

  return (
    <span
      className={`
        absolute ${badge.position === 'left' ? 'top-2 left-2' : 'top-2 right-2'}
        z-10 flex items-center gap-0.5
        ${style.bg} ${style.darkBg} ${style.text} ${style.darkText}
        ${isSm ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-1'}
        font-black uppercase tracking-wider rounded-md shadow-sm pointer-events-none
      `}
    >
      {style.icon}
      {badge.label}
    </span>
  );
}
