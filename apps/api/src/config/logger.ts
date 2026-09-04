import winston from "winston";
import { Request, Response, NextFunction } from "express";
import { ENV } from "./env.js";

const logLevel = process.env.LOG_LEVEL || (ENV.NODE_ENV === "production" ? "info" : "debug");

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
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
  defaultMeta: { service: "waw-api" },
  transports,
});

export function requestTracer(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const requestId =
    (req.headers["x-request-id"] as string) ||
    `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  res.setHeader("X-Request-Id", requestId);
  (req as any).requestId = requestId;
  next();
}
