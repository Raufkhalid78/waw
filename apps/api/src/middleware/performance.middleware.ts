import { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger.js";

/**
 * Tracks request duration and logs slow requests (>1s).
 * Attaches X-Response-Time header to all responses.
 */
export function performanceTracker(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;
    const durationStr = `${durationMs.toFixed(1)}ms`;

    if (durationMs > 1000) {
      logger.warn("Slow request detected", {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: durationStr,
        ip: req.ip,
      });
    }

    if (req.path.startsWith("/api/") && !req.path.startsWith("/api/docs")) {
      logger.info("API request", {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: durationStr,
      });
    }
  });

  next();
}
