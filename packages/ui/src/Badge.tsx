import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'amber' | 'emerald' | 'sky' | 'rose' | 'slate';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'amber',
  ...props
}) => {
  const variantStyles = {
    amber: 'bg-amber-100 text-amber-900 border-amber-300',
    emerald: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    sky: 'bg-sky-100 text-sky-900 border-sky-300',
    rose: 'bg-rose-100 text-rose-900 border-rose-300',
    slate: 'bg-slate-100 text-slate-800 border-slate-200',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black border uppercase tracking-wider',
          variantStyles[variant],
          className
        )
      )}
      {...props}
    >
      {children}
    </span>
  );
};
