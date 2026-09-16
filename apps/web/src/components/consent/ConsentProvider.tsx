"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  ConsentCategories,
  ConsentStatus,
  getStoredConsent,
  storeConsent,
} from "@/lib/consent";

type ConsentContextValue = {
  status: ConsentStatus; // "unset" until the visitor chooses
  categories: ConsentCategories | null; // null while status === "unset"
  acceptAll: () => void;
  rejectAll: () => void;
  saveChoices: (choices: { analytics: boolean; marketing?: boolean }) => void;
  reopen: () => void; // show the banner again (Footer "Cookie settings" link)
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<ConsentStatus>("unset");
  const [categories, setCategories] = useState<ConsentCategories | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  // Hydrate from cookie on mount. Avoid SSR mismatch by resolving after paint.
  useEffect(() => {
    const stored = getStoredConsent();
    if (stored) {
      setCategories(stored);
      setStatus(stored.analytics || stored.marketing ? "granted" : "denied");
    } else {
      setStatus("unset");
      setShowBanner(true);
    }
  }, []);

  const persist = useCallback((next: ConsentCategories) => {
    storeConsent(next);
    setCategories(next);
    setStatus(next.analytics || next.marketing ? "granted" : "denied");
    setShowBanner(false);
  }, []);

  const value = useMemo<ConsentContextValue>(
    () => ({
      status,
      categories,
      acceptAll: () => persist({ essential: true, analytics: true, marketing: true }),
      rejectAll: () => persist({ essential: true, analytics: false, marketing: false }),
      saveChoices: (choices) =>
        persist({ essential: true, analytics: !!choices.analytics, marketing: !!choices.marketing }),
      reopen: () => setShowBanner(true),
    }),
    [status, categories, persist],
  );

  return (
    <ConsentContext.Provider value={value}>
      {children}
      {showBanner && <ConsentBanner onSave={value.saveChoices} onAcceptAll={value.acceptAll} onRejectAll={value.rejectAll} />}
    </ConsentContext.Provider>
  );
}

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    // Safe no-op defaults when the provider is absent (tests, static renders)
    return {
      status: "unset",
      categories: null,
      acceptAll: () => {},
      rejectAll: () => {},
      saveChoices: () => {},
      reopen: () => {},
    };
  }
  return ctx;
}

function ConsentBanner({
  onSave,
  onAcceptAll,
  onRejectAll,
}: {
  onSave: (choices: { analytics: boolean }) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
}) {
  const [analytics, setAnalytics] = useState(true);
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      role="dialog"
      aria-modal={false}
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[90] p-3 sm:p-4 animate-[slideUp_.3s_ease-out]"
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
        <p className="text-sm text-slate-700">
          We use essential cookies to run Waw (cart, login, checkout). With your
          permission we also use analytics cookies to understand how people shop
          and improve the marketplace. Read our{" "}
          <a href="/privacy" className="font-semibold text-amber-600 underline underline-offset-2">
            Privacy Policy
          </a>
          .
        </p>

        {expanded && (
          <label className="mt-3 flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={analytics}
              onChange={(e) => setAnalytics(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-amber-500"
            />
            <span>
              <span className="font-medium">Analytics</span> — anonymous usage
              statistics (Google Analytics 4, IP anonymized). Essential cookies
              cannot be disabled.
            </span>
          </label>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onAcceptAll}
            className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-amber-300"
          >
            Accept all
          </button>
          <button
            type="button"
            onClick={onRejectAll}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Reject non-essential
          </button>
          {expanded ? (
            <button
              type="button"
              onClick={() => onSave({ analytics })}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Save my choice
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 underline underline-offset-2 hover:text-slate-900"
              aria-expanded={expanded}
            >
              Manage cookies
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
