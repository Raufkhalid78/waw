/**
 * Lightweight logger for admin Next.js app.
 * Replaces console.log with structured logging.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

function log(level: LogLevel, message: string, context?: Record<string, any>): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: "waw-admin",
    ...context,
  };

  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else if (level === "warn") {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, any>) => log("debug", message, context),
  info: (message: string, context?: Record<string, any>) => log("info", message, context),
  warn: (message: string, context?: Record<string, any>) => log("warn", message, context),
  error: (message: string, context?: Record<string, any>) => log("error", message, context),
};
