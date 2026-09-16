"use client";

import Script from "next/script";
import { useEffect } from "react";
import { useConsent } from "@/components/consent/ConsentProvider";

/**
 * Google Analytics 4 — loaded ONLY when BOTH conditions hold:
 *  1. NEXT_PUBLIC_GA_MEASUREMENT_ID is configured (format G-XXXXXXXXXX)
 *  2. The visitor granted analytics consent (see ConsentProvider)
 *
 * Until consent is granted, zero third-party requests fire. After consent is
 * withdrawn via "Cookie settings", gtag is disabled for the session and the
 * consent cookie blocks re-loading on the next navigation.
 */

type GtagEventParams = Record<string, string | number | boolean | undefined | string[]>;

type GtagWindow = Window & { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void };

/**
 * Install the official gtag shim if gtag.js hasn't loaded yet, so consent
 * updates and events queue in dataLayer exactly the way the Google snippet
 * does (arguments-object form — the only form gtag.js is guaranteed to
 * process from a queue).
 */
function ensureGtag(): ((...a: unknown[]) => void) | null {
  if (typeof window === "undefined") return null;
  const w = window as GtagWindow;
  w.dataLayer = w.dataLayer || [];
  if (typeof w.gtag !== "function") {
    w.gtag = function gtag() {
      w.dataLayer!.push(arguments);
    } as (...a: unknown[]) => void;
  }
  return w.gtag!;
}

/** Fire a GA4 ecommerce / interaction event (queued; consent mode gates processing). */
export function trackEvent(name: string, params?: GtagEventParams) {
  const gtag = ensureGtag();
  if (gtag) gtag("event", name, params ?? {});
}

export function Analytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const idValid = !!gaId && /^G-[A-Z0-9]{6,}$/.test(gaId);
  const { status, categories } = useConsent();

  const analyticsAllowed = status === "granted" && !!categories?.analytics;

  // Reflect consent into gtag (consent-mode v2). Events queued via trackEvent
  // before gtag.js loads are processed only if analytics_storage is granted.
  useEffect(() => {
    if (!idValid) return;
    const gtag = ensureGtag();
    if (!gtag) return;
    gtag(
      "consent",
      "update",
      analyticsAllowed
        ? { analytics_storage: "granted", ad_storage: "granted" }
        : { analytics_storage: "denied", ad_storage: "denied" },
    );
  }, [analyticsAllowed, idValid]);

  if (!idValid) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          // Default DENIED — flips to granted only after the visitor opts in
          // (ConsentProvider pushes a consent.update event).
          gtag('consent', 'default', {
            analytics_storage: 'denied',
            ad_storage: 'denied',
            wait_for_update: 500
          });
          gtag('set', 'url_passthrough', false);
          gtag('config', '${gaId}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
