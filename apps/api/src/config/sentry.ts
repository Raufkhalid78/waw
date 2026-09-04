let Sentry: typeof import("@sentry/node") | null = null;

try {
  Sentry = await import("@sentry/node");
} catch {
  // Sentry not installed
}

import { ENV } from "./env.js";

export function initSentry(): void {
  if (!Sentry || ENV.NODE_ENV !== "production" || !ENV.SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: ENV.SENTRY_DSN,
    environment: ENV.NODE_ENV,
    tracesSampleRate: 0.1,
  });

  console.log("Sentry error tracking initialized");
}

export function captureException(error: Error, context?: Record<string, unknown>): void {
  if (!Sentry || ENV.NODE_ENV !== "production" || !ENV.SENTRY_DSN) {
    return;
  }

  Sentry.withScope((scope: any) => {
    if (context) {
      for (const [key, value] of Object.entries(context)) {
        scope.setExtra(key, value);
      }
    }
    Sentry!.captureException(error);
  });
}

export function captureMessage(message: string, level: string = "info"): void {
  if (!Sentry || ENV.NODE_ENV !== "production" || !ENV.SENTRY_DSN) {
    return;
  }

  Sentry.captureMessage(message, level as any);
}
