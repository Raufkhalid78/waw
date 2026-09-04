import React, { useEffect, useState } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastVariant = "success" | "error" | "info";

export interface ToastProps {
  message: string;
  variant?: ToastVariant;
  onClose: () => void;
  duration?: number;
}

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const variantStyles = {
  success: "bg-emerald-50 border-emerald-200 text-emerald-800",
  error: "bg-rose-50 border-rose-200 text-rose-800",
  info: "bg-sky-50 border-sky-200 text-sky-800",
};

export const Toast: React.FC<ToastProps> = ({
  message,
  variant = "success",
  onClose,
  duration = 4000,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const Icon = icons[variant];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={twMerge(
        "fixed bottom-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-lg transition-all duration-300",
        variantStyles[variant],
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        className="ml-2 p-0.5 rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

// Simple toast manager for non-React usage
let toastId = 0;
type ToastItem = { id: number; message: string; variant: ToastVariant };

let listeners: ((items: ToastItem[]) => void)[] = [];
let toasts: ToastItem[] = [];

function notify() {
  listeners.forEach((l) => l([...toasts]));
}

export const toast = {
  success(message: string) {
    toasts = [...toasts, { id: ++toastId, message, variant: "success" }];
    notify();
  },
  error(message: string) {
    toasts = [...toasts, { id: ++toastId, message, variant: "error" }];
    notify();
  },
  info(message: string) {
    toasts = [...toasts, { id: ++toastId, message, variant: "info" }];
    notify();
  },
  dismiss(id: number) {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  },
  subscribe(listener: (items: ToastItem[]) => void) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },
};

export function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    return toast.subscribe(setItems);
  }, []);

  return (
    <>
      {items.map((t) => (
        <Toast
          key={t.id}
          message={t.message}
          variant={t.variant}
          onClose={() => toast.dismiss(t.id)}
        />
      ))}
    </>
  );
}
