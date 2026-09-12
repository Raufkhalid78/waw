/**
 * Minimal cross-page error surface for the seller portal.
 *
 * The API layer (lib/api.ts) intentionally swallows fetch failures and
 * returns empty arrays so individual pages keep rendering. But a seller
 * with an expired session or an API outage then sees a silently EMPTY
 * dashboard — indistinguishable from "no data". This module lets the API
 * layer broadcast what failed so the shell can show one non-blocking
 * banner instead of dozens of console.error calls.
 */

export type ApiErrorNotice = {
  scope: string;
  message: string;
  at: number;
};

type Listener = (notice: ApiErrorNotice) => void;

const listeners = new Set<Listener>();

export function reportApiError(scope: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err || "Request failed");
  if (typeof window !== "undefined") {
    console.error(`[seller-api] ${scope}:`, err);
  }
  const notice: ApiErrorNotice = { scope, message, at: Date.now() };
  for (const l of listeners) {
    try {
      l(notice);
    } catch {
      // listener errors must never break the reporting path
    }
  }
}

export function subscribeToApiErrors(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
