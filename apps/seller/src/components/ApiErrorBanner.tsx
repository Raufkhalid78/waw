"use client";

import { useEffect, useState } from "react";
import { subscribeToApiErrors, type ApiErrorNotice } from "@/lib/api-errors";
import { AlertTriangle, X } from "lucide-react";

/**
 * Global non-blocking banner for background API failures. The seller API
 * layer (lib/api.ts) swallows fetch errors to keep pages rendering; this
 * component surfaces them so an empty dashboard is distinguishable from
 * an outage/expired session.
 */
export function ApiErrorBanner() {
  const [notice, setNotice] = useState<ApiErrorNotice | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToApiErrors((n) => setNotice(n));
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 8000);
    return () => clearTimeout(t);
  }, [notice]);

  if (!notice) return null;

  return (
    <div className="mx-4 mt-3 flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-300 text-sm text-amber-900">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <span className="flex-1">
        {notice.message} — some data may not have loaded. Try refreshing.
      </span>
      <button
        onClick={() => setNotice(null)}
        className="p-0.5 rounded hover:bg-amber-100"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
