type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  data?: unknown;
  timestamp: string;
}

const isDev = process.env.NODE_ENV === "development";
const isBrowser = typeof window !== "undefined";

async function captureToSentry(entry: LogEntry) {
  if (isDev || !isBrowser) return;
  try {
    const Sentry = await import("@sentry/nextjs");
    if (entry.level === "error") {
      Sentry.captureException(
        entry.data instanceof Error ? entry.data : new Error(entry.message),
        {
          level: "error",
          extra: {
            context: entry.context,
            data: entry.data,
          },
        }
      );
    } else {
      Sentry.captureMessage(entry.message, entry.level as any);
    }
  } catch {
    // @sentry/nextjs not installed — skip
  }
}

function emit(entry: LogEntry) {
  if (isDev) {
    const prefix = `[WAW][${entry.level.toUpperCase()}]${entry.context ? `[${entry.context}]` : ""}`;
    const args = [prefix, entry.message, entry.data].filter(Boolean);
    switch (entry.level) {
      case "debug": console.debug(...args); break;
      case "info": console.info(...args); break;
      case "warn": console.warn(...args); break;
      case "error": console.error(...args); break;
    }
  }
  captureToSentry(entry);
}

export const logger = {
  debug(message: string, context?: string, data?: unknown) {
    emit({ level: "debug", message, context, data, timestamp: new Date().toISOString() });
  },
  info(message: string, context?: string, data?: unknown) {
    emit({ level: "info", message, context, data, timestamp: new Date().toISOString() });
  },
  warn(message: string, context?: string, data?: unknown) {
    emit({ level: "warn", message, context, data, timestamp: new Date().toISOString() });
  },
  error(message: string, context?: string, data?: unknown) {
    emit({ level: "error", message, context, data, timestamp: new Date().toISOString() });
  },
};
