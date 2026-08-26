import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  hoverEffect = false,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          "bg-white border border-slate-200 rounded-3xl p-6 shadow-xs",
          hoverEffect &&
            "hover:shadow-md hover:border-slate-300 transition-all",
          className,
        ),
      )}
      {...props}
    >
      {children}
    </div>
  );
};
