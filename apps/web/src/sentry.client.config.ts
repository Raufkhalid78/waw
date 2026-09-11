import * as Sentry from "@sentry/nextjs";

// Client-side Sentry. Only active when a DSN is configured — the storefront
// must never ship errors blind, but local dev and unconfigured environments
// pay zero overhead.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENV || process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.5,
  });
}

export {};
