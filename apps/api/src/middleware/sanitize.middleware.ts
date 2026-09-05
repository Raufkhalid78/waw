import { Request, Response, NextFunction } from "express";

/**
 * XSS sanitization middleware.
 * Escapes HTML entities in string values to prevent stored/reflected XSS.
 * Applied to req.body, req.query, and req.params.
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "`": "&#96;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"'\/`]/g, (char) => HTML_ESCAPE_MAP[char] || char);
}

function sanitizeObject(obj: any): any {
  if (typeof obj === "string") {
    return escapeHtml(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  if (obj && typeof obj === "object" && obj.constructor === Object) {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  return obj;
}

export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === "object") {
    req.query = sanitizeObject(req.query) as any;
  }
  if (req.params && typeof req.params === "object") {
    req.params = sanitizeObject(req.params) as any;
  }
  next();
}
