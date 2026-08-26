import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-bold rounded-2xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-xs sm:text-sm",
    lg: "px-6 py-3.5 text-sm sm:text-base font-black",
  };

  const variantStyles = {
    primary:
      "bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-xs hover:shadow-md",
    secondary: "bg-slate-950 hover:bg-slate-900 text-white shadow-xs",
    outline:
      "border-2 border-slate-200 hover:border-slate-400 text-slate-800 bg-white",
    danger: "bg-rose-600 hover:bg-rose-700 text-white",
    ghost: "hover:bg-slate-100 text-slate-700",
  };

  return (
    <button
      className={twMerge(
        clsx(baseStyles, sizeStyles[size], variantStyles[variant], className),
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="inline-block animate-spin mr-2">⟳</span>
      ) : null}
      {children}
    </button>
  );
};
