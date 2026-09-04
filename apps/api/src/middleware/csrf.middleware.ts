import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

const CSRF_COOKIE_NAME = "waw_csrf";
const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * CSRF protection middleware using the Double Submit Cookie pattern.
 *
 * How it works:
 * 1. On login, server generates a random CSRF token and sets it in a
 *    non-HttpOnly cookie (waw_csrf) so JavaScript can read it.
 * 2. Client reads the cookie and sends the value in the x-csrf-token header.
 * 3. Server compares the cookie value with the header value.
 * 4. If they match, the request is legitimate (same-origin).
 *
 * This is safe because:
 * - HttpOnly session cookie cannot be read by JavaScript
 * - CSRF cookie IS readable by JavaScript but only same-origin
 * - An attacker's page can read their own CSRF cookie but NOT the victim's
 * - The attacker cannot read the victim's CSRF cookie due to same-origin policy
 */

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function setCsrfCookie(res: Response, token: string): void {
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by JavaScript
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 900, // 15 minutes, matches session TTL
  });
}

/**
 * Middleware that validates CSRF token on state-changing requests.
 * Skips validation for safe methods (GET, HEAD, OPTIONS).
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip CSRF for safe HTTP methods
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Skip CSRF for API auth endpoints (login, OTP, OAuth)
  // These are public endpoints that don't require session authentication
  const publicAuthPaths = [
    "/api/auth/login",
    "/api/auth/whatsapp-otp/send",
    "/api/auth/whatsapp-otp/verify",
  ];
  if (publicAuthPaths.some((p) => req.path.startsWith(p))) {
    return next();
  }

  const csrfCookie = req.cookies?.[CSRF_COOKIE_NAME];
  const csrfHeader = req.headers[CSRF_HEADER_NAME] as string;

  if (!csrfCookie || !csrfHeader) {
    res.status(403).json({ error: "CSRF token missing" });
    return;
  }

  // Constant-time comparison to prevent timing attacks
  const a = Buffer.from(csrfCookie);
  const b = Buffer.from(csrfHeader);

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    res.status(403).json({ error: "CSRF token mismatch" });
    return;
  }

  next();
}
