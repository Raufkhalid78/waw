"use client";

/**
 * Cookie consent state machine (GDPR / PECA-2016 friendly).
 *
 * Categories:
 *  - "essential" — always on (session, CSRF, cart token). Never asked for.
 *  - "analytics" — GA4; OFF until the visitor opts in.
 *  - "marketing" — reserved for future ad pixels; OFF by default.
 *
 * State persists in a first-party cookie for 12 months, readable server-side
 * via the `waw_consent` cookie if needed. No external requests fire before
 * consent (see Analytics.tsx — the gtag script mounts only after "granted").
 */

export type ConsentStatus = "unset" | "granted" | "denied";
export type ConsentCategories = {
  essential: true; // always true
  analytics: boolean;
  marketing: boolean;
};

export const CONSENT_COOKIE = "waw_consent";
const CONSENT_MAX_AGE = 60 * 60 * 24 * 365; // 12 months

function serialize(categories: ConsentCategories): string {
  // Format: v1:analytics=1|marketing=0 — stable, human-readable, cheap to parse.
  return `v1:analytics=${categories.analytics ? 1 : 0}|marketing=${categories.marketing ? 1 : 0}`;
}

export function parseConsentCookie(raw: string | undefined | null): ConsentCategories | null {
  if (!raw) return null;
  const m = /^v1:analytics=([01])\|marketing=([01])$/.exec(raw);
  if (!m) return null;
  return { essential: true, analytics: m[1] === "1", marketing: m[2] === "1" };
}

/** Read consent from the document cookie (client only). */
export function getStoredConsent(): ConsentCategories | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${CONSENT_COOKIE}=`))
    ?.split("=")
    .slice(1)
    .join("=");
  return parseConsentCookie(decodeURIComponent(raw ?? ""));
}

/** Persist a consent decision (expires in 12 months, same-site lax). */
export function storeConsent(categories: ConsentCategories): void {
  if (typeof document === "undefined") return;
  document.cookie = [
    `${CONSENT_COOKIE}=${encodeURIComponent(serialize(categories))}`,
    `max-age=${CONSENT_MAX_AGE}`,
    "path=/",
    "SameSite=Lax",
    ...(process.env.NODE_ENV === "production" ? ["Secure"] : []),
  ].join("; ");
}

/** Withdraw consent — analytics load is disabled on next navigation. */
export function revokeConsent(): void {
  storeConsent({ essential: true, analytics: false, marketing: false });
}
