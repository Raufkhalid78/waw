import { Request, Response, NextFunction } from "express";

const API_VERSION = "2026-08-28";
const DEPRECATED_VERSIONS: string[] = [];

export const apiVersioning = (req: Request, res: Response, next: NextFunction) => {
  // Add API version headers to all responses
  res.setHeader("X-API-Version", API_VERSION);
  res.setHeader("X-API-Deprecated", "false");

  // Check for deprecated version usage
  const requestedVersion = req.headers["x-api-version"] as string;
  if (requestedVersion && DEPRECATED_VERSIONS.includes(requestedVersion)) {
    res.setHeader("X-API-Deprecated", "true");
    res.setHeader(
      "Warning",
      `299 - "API version ${requestedVersion} is deprecated. Use ${API_VERSION} instead."`
    );
  }

  next();
};
