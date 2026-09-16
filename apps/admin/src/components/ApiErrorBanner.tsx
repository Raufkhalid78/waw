"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Non-blocking banner for failed API loads. Surfaces the error message and
 * an optional Retry action so an empty list is distinguishable from an
 * outage or an expired session.
 */
export function ApiErrorBanner({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  if (!message) return null;

  return (
    <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-300 text-sm text-amber-900">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <span className="flex-1">
        {message} — some data may not have loaded.
      </span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-medium shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}
