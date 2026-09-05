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

// ── Custom Metrics & Alerting ──────────────────────────────────────────────

interface MetricData {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp: number;
}

class MonitoringService {
  private metrics: MetricData[] = [];
  private alerts: Array<{
    id: string;
    type: string;
    message: string;
    severity: "low" | "medium" | "high" | "critical";
    timestamp: number;
    acknowledged: boolean;
  }> = [];
  private thresholds: Record<string, { warning: number; critical: number }> = {
    error_rate: { warning: 0.05, critical: 0.1 },
    response_time_p99: { warning: 2000, critical: 5000 },
    response_time_p95: { warning: 1000, critical: 3000 },
    memory_usage_mb: { warning: 512, critical: 1024 },
    active_connections: { warning: 80, critical: 95 },
    queue_depth: { warning: 100, critical: 500 },
    job_failure_rate: { warning: 0.1, critical: 0.25 },
  };

  /**
   * Record a metric data point
   */
  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    const metric: MetricData = {
      name,
      value,
      tags,
      timestamp: Date.now(),
    };

    this.metrics.push(metric);

    // Keep only last 1000 metrics in memory
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Check thresholds and create alerts
    this.checkThreshold(name, value);
  }

  /**
   * Check metric against thresholds
   */
  private checkThreshold(name: string, value: number): void {
    const threshold = this.thresholds[name];
    if (!threshold) return;

    if (value >= threshold.critical) {
      this.createAlert({
        type: "threshold_critical",
        message: `Critical: ${name} = ${value} (threshold: ${threshold.critical})`,
        severity: "critical",
      });
    } else if (value >= threshold.warning) {
      this.createAlert({
        type: "threshold_warning",
        message: `Warning: ${name} = ${value} (threshold: ${threshold.warning})`,
        severity: "medium",
      });
    }
  }

  /**
   * Create an alert
   */
  createAlert(alert: Omit<typeof this.alerts[0], "id" | "timestamp" | "acknowledged">): void {
    const newAlert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      acknowledged: false,
    };

    this.alerts.push(newAlert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    // Log alert
    logger.warn(`🔔 Alert: ${newAlert.message}`, {
      alertId: newAlert.id,
      severity: newAlert.severity,
      type: newAlert.type,
    });

    // Send to Sentry for critical alerts
    if (newAlert.severity === "critical") {
      captureMessage(newAlert.message, "error");
    }
  }

  /**
   * Get current metrics summary
   */
  getMetricsSummary(): {
    totalMetrics: number;
    recentMetrics: MetricData[];
    alerts: Array<{
      id: string;
      type: string;
      message: string;
      severity: "low" | "medium" | "high" | "critical";
      timestamp: number;
      acknowledged: boolean;
    }>;
    activeAlerts: number;
  } {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const recentMetrics = this.metrics.filter((m) => m.timestamp > fiveMinutesAgo);

    return {
      totalMetrics: this.metrics.length,
      recentMetrics: recentMetrics.slice(-50),
      alerts: this.alerts.slice(-20),
      activeAlerts: this.alerts.filter((a) => !a.acknowledged).length,
    };
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      logger.info(`✅ Alert acknowledged: ${alertId}`);
      return true;
    }
    return false;
  }

  /**
   * Record business metrics
   */
  recordBusinessMetric(type: string, value: number, metadata?: Record<string, any>): void {
    this.recordMetric(`business.${type}`, value, metadata as Record<string, string>);

    // Log business events
    logger.info(`📊 Business Metric: ${type} = ${value}`, metadata);
  }

  /**
   * Record API performance metrics
   */
  recordApiMetric(path: string, method: string, statusCode: number, durationMs: number): void {
    this.recordMetric("api.response_time", durationMs, {
      path,
      method,
      status: String(statusCode),
    });

    this.recordMetric("api.request_count", 1, {
      path,
      method,
      status: String(statusCode),
    });

    // Track error rates
    if (statusCode >= 400) {
      this.recordMetric("api.error_count", 1, {
        path,
        method,
        status: String(statusCode),
      });
    }
  }
}

export const monitoring = new MonitoringService();
