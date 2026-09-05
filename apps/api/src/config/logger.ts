import winston from "winston";
import { Request, Response, NextFunction } from "express";
import { ENV } from "./env.js";

const logLevel = process.env.LOG_LEVEL || (ENV.NODE_ENV === "production" ? "info" : "debug");

// Custom format with correlation ID support
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, correlationId, requestId, userId, ...meta }) => {
    const prefixes: string[] = [];
    if (correlationId) prefixes.push(`[${correlationId}]`);
    if (requestId) prefixes.push(`[${requestId}]`);
    if (userId) prefixes.push(`[user:${userId}]`);
    const prefix = prefixes.length ? prefixes.join("") + " " : "";
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `[${timestamp}] ${level}: ${prefix}${message}${metaStr}`;
  }),
);

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json(),
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: ENV.NODE_ENV === "production" ? jsonFormat : consoleFormat,
  }),
];

if (ENV.NODE_ENV === "production") {
  transports.push(
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      format: jsonFormat,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: "logs/combined.log",
      format: jsonFormat,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
    }),
  );
}

export const logger = winston.createLogger({
  level: logLevel,
  defaultMeta: { service: "waw-api", environment: ENV.NODE_ENV || "development" },
  transports,
});

/**
 * Create a child logger with correlation context
 */
export function createCorrelatedLogger(context: {
  correlationId?: string;
  requestId?: string;
  userId?: string;
  orderId?: string;
  jobId?: string;
}) {
  return logger.child(context);
}

/**
 * Request tracing middleware with correlation ID propagation
 */
export function requestTracer(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Generate or propagate correlation ID (for distributed tracing)
  const correlationId =
    (req.headers["x-correlation-id"] as string) ||
    (req.headers["x-request-id"] as string) ||
    `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Store correlation ID on request
  (req as any).correlationId = correlationId;
  (req as any).requestId = correlationId;

  // Propagate correlation ID in response
  res.setHeader("X-Correlation-Id", correlationId);
  res.setHeader("X-Request-Id", correlationId);

  // Log request start
  const startTime = Date.now();
  logger.info(`→ ${req.method} ${req.path}`, {
    correlationId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });

  // Log request completion
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 400 ? "warn" : "info";
    logger[level](`← ${req.method} ${req.path} ${res.statusCode}`, {
      correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: duration,
    });
  });

  next();
}
