let Sentry: typeof import("@sentry/node") | null = null;

try {
  Sentry = await import("@sentry/node");
} catch {
  // Sentry not installed
}

import { ENV } from "./env.js";
import { logger } from "./logger.js";

export function initSentry(): void {
  if (!Sentry || ENV.NODE_ENV !== "production" || !ENV.SENTRY_DSN) {
    logger.info("Sentry error tracking disabled (not production or no DSN)");
    return;
  }

  Sentry.init({
    dsn: ENV.SENTRY_DSN,
    environment: ENV.NODE_ENV,
    tracesSampleRate: 0.1,
    integrations: [
      // Auto-capture HTTP requests and sessions
    ],
    beforeSend(event) {
      // Sanitize sensitive data before sending
      if (event.request?.data) {
        const data = event.request.data as Record<string, unknown>;
        delete data.password;
        delete data.token;
        delete data.otp;
        delete data.apiKey;
      }
      return event;
    },
  });

  logger.info("Sentry error tracking initialized");
}

/**
 * Express middleware to attach request context to Sentry scope.
 * Place this BEFORE your routes.
 */
export function sentryRequestContext(req: any, _res: any, next: any): void {
  if (!Sentry || ENV.NODE_ENV !== "production" || !ENV.SENTRY_DSN) {
    next();
    return;
  }

  Sentry.withScope((scope) => {
    scope.setTag("url", req.originalUrl);
    scope.setTag("method", req.method);
    scope.setTag("ip", req.ip || req.connection?.remoteAddress || "unknown");

    if (req.user) {
      scope.setUser({
        id: req.user.id,
        email: req.user.email,
      });
    }

    if (req.headers["x-request-id"]) {
      scope.setTag("request_id", req.headers["x-request-id"] as string);
    }
  });

  next();
}

/**
 * Express error handler middleware for Sentry.
 * Place this AFTER your routes and BEFORE default error handler.
 */
export function sentryErrorHandler(err: Error, req: any, _res: any, next: any): void {
  if (!Sentry || ENV.NODE_ENV !== "production" || !ENV.SENTRY_DSN) {
    next(err);
    return;
  }

  Sentry.withScope((scope) => {
    scope.setTag("url", req.originalUrl);
    scope.setTag("method", req.method);

    if (req.user) {
      scope.setUser({
        id: req.user.id,
        email: req.user.email,
      });
    }
  });

  Sentry.captureException(err);
  next(err);
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
