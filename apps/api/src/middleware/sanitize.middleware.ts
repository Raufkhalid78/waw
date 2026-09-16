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
  "`": "&#96;",
};

function escapeHtml(value: string): string {
  // NOTE: "/" is intentionally NOT escaped — escaping it mangles legitimate
  // data like addresses ("Karachi/DHA") and webhook payload fields that
  // are later persisted verbatim. "/" carries no XSS risk in text contexts.
  return value.replace(/[&<>"'`]/g, (char) => HTML_ESCAPE_MAP[char] || char);
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

/**
 * Server-to-server webhook/IPN paths are HMAC-verified upstream (or
 * signature-verified in their handlers) and their payloads are persisted or
 * compared verbatim (tracking numbers, gateway references, URL params with
 * "&"). HTML-escaping them corrupts matching/lookups, so they are exempt
 * from the global escaper. Everything else stays sanitized.
 */
const WEBHOOK_BODY_PATHS = new Set([
  "/api/logistics/postex/webhook",
  "/api/payments/apg/ipn",
  "/api/payments/raast/webhook",
]);

export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  const isWebhook = WEBHOOK_BODY_PATHS.has(req.path);

  if (!isWebhook && req.body && typeof req.body === "object") {
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
