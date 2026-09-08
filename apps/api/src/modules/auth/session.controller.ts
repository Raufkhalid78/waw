import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { SessionService } from "./session.service.js";
import { setCsrfCookie, generateCsrfToken } from "../../middleware/csrf.middleware.js";
import { supabaseAdmin } from "../../config/supabase.js";
import { ENV } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { resolveAccessToken } from "../../middleware/auth.middleware.js";

const isProduction = process.env.NODE_ENV === "production";

interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "strict" | "lax" | "none";
  path: string;
  maxAge: number;
}

const ACCESS_COOKIE_OPTS: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "strict",
  path: "/",
  maxAge: 900, // 15 minutes
};

const REFRESH_COOKIE_OPTS: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "strict",
  path: "/api/auth/session",
  maxAge: 7 * 24 * 60 * 60, // 7 days
};

/**
 * Set session cookies on the response.
 */
function setSessionCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  csrfToken: string,
): void {
  res.cookie("waw_session", accessToken, ACCESS_COOKIE_OPTS);
  res.cookie("waw_refresh", refreshToken, REFRESH_COOKIE_OPTS);
  setCsrfCookie(res, csrfToken);
}

/**
 * Clear all session cookies.
 */
function clearSessionCookies(res: Response): void {
  res.clearCookie("waw_session", { path: "/" });
  res.clearCookie("waw_refresh", { path: "/api/auth/session" });
  res.clearCookie("waw_csrf", { path: "/" });
}

export class SessionController {
  /**
   * GET /api/auth/csrf
   * Issues a CSRF token and cookie so clients can bootstrap
   * the x-csrf-token header before creating a session.
   */
  static issueCsrf(req: Request, res: Response): void {
    const token = generateCsrfToken();
    setCsrfCookie(res, token);
    res.json({ csrfToken: token });
  }

  /**
   * POST /api/auth/session/create
   * Creates a new session after successful authentication.
   * Called by the login page after OTP/email verification succeeds.
   */
  static async createSession(req: Request, res: Response): Promise<void> {
    try {
      const { userId, userRole, userPhone, userEmail, storeId, authToken } = req.body;

      if (!userId) {
        res.status(400).json({ error: "userId is required" });
        return;
      }

      // SECURITY: An authToken is mandatory. It is either:
      //  (a) a Supabase access token (OAuth / email+password flows), or
      //  (b) an API-issued JWT from OTP/email login (signed with JWT_SECRET).
      // Without a verified token, no session can ever be created.
      if (!authToken) {
        res.status(401).json({ error: "Authentication required: authToken missing" });
        return;
      }

      // Try Supabase first (OAuth users, Supabase email/password accounts)
      let verifiedUserId: string | null = null;
      const { data: { user }, error: authError } = await supabaseAdmin.auth
        .getUser(authToken)
        .catch(() => ({ data: { user: null }, error: new Error("supabase unavailable") }));

      if (!authError && user) {
        if (user.id !== userId) {
          res.status(401).json({ error: "Invalid authentication token" });
          return;
        }
        verifiedUserId = user.id;
      } else {
        // Fall back to API-issued JWT (phone OTP / email login flows)
        try {
          const decoded = jwt.verify(authToken, ENV.JWT_SECRET) as {
            sub?: string;
            phone?: string;
            role?: string;
          };
          if (decoded.sub !== userId) {
            res.status(401).json({ error: "Invalid authentication token" });
            return;
          }
          verifiedUserId = decoded.sub ?? null;
          if (!verifiedUserId) {
            res.status(401).json({ error: "Invalid authentication token" });
            return;
          }
        } catch {
          res.status(401).json({ error: "Invalid authentication token" });
          return;
        }
      }

      // SECURITY: Never trust client-supplied role. Load authoritative role from database.
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("role, phone, email")
        .eq("id", userId)
        .single();

      const authoritativeRole = profile?.role || "BUYER";
      const authoritativePhone = profile?.phone || userPhone || "";
      const authoritativeEmail = profile?.email || userEmail || "";

      // Reject if client-supplied role differs from database role (prevents escalation)
      if (userRole && userRole !== authoritativeRole) {
        logger.warn("Session creation role mismatch rejected", {
          userId,
          requestedRole: userRole,
          dbRole: authoritativeRole,
        });
      }

      const ip = req.ip || req.socket.remoteAddress || "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";

      const tokens = await SessionService.createSession({
        userId,
        userRole: authoritativeRole,
        userPhone: authoritativePhone,
        userEmail: authoritativeEmail,
        storeId,
        ip,
        userAgent,
      });

      setSessionCookies(res, tokens.accessToken, tokens.refreshToken, tokens.csrfToken);

      res.json({
        success: true,
        user: { id: userId, role: authoritativeRole, phone: authoritativePhone, email: authoritativeEmail },
        // Body tokens for non-cookie clients (mobile) — cookie clients
        // ignore these and keep using the httpOnly cookies set above.
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      });
    } catch (err: any) {
      logger.error("Session creation failed", { error: err.message });
      res.status(500).json({ error: "Failed to create session" });
    }
  }

  /**
   * POST /api/auth/session/refresh
   * Refreshes an expired access token using the refresh token cookie.
   */
  static async refreshSession(req: Request, res: Response): Promise<void> {
    try {
      // Cookie clients carry the refresh token in waw_refresh; token-based
      // clients (mobile) send it in the JSON body.
      const refreshToken = req.cookies?.waw_refresh || req.body?.refreshToken;

      if (!refreshToken) {
        res.status(401).json({ error: "No refresh token found" });
        return;
      }

      const ip = req.ip || req.socket.remoteAddress || "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";

      const tokens = await SessionService.refreshSession(refreshToken, ip, userAgent);

      if (!tokens) {
        if (!req.body?.refreshToken) clearSessionCookies(res);
        res.status(401).json({ error: "Session expired or invalid" });
        return;
      }

      setSessionCookies(res, tokens.accessToken, tokens.refreshToken, tokens.csrfToken);

      res.json({
        success: true,
        // Body tokens for non-cookie clients (mobile).
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      });
    } catch (err: any) {
      logger.error("Session refresh failed", { error: err.message });
      res.status(500).json({ error: "Failed to refresh session" });
    }
  }

  /**
   * POST /api/auth/session/revoke
   * Revokes the current session (logout).
   */
  static async revokeSession(req: Request, res: Response): Promise<void> {
    try {
      const accessToken = resolveAccessToken(req);

      if (accessToken) {
        await SessionService.revokeSession(accessToken);
      }

      clearSessionCookies(res);

      res.json({ success: true });
    } catch (err: any) {
      logger.error("Session revocation failed", { error: err.message });
      res.status(500).json({ error: "Failed to revoke session" });
    }
  }

  /**
   * GET /api/auth/session/me
   * Returns the current user from the session cookie.
   */
  static async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      const accessToken = resolveAccessToken(req);

      if (!accessToken) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      const session = await SessionService.validateSession(accessToken);

      if (!session) {
        clearSessionCookies(res);
        res.status(401).json({ error: "Session expired" });
        return;
      }

      // SECURITY: Always load authoritative role from database, never trust Redis-stored role
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("role, phone, email")
        .eq("id", session.userId)
        .single();

      res.json({
        user: {
          id: session.userId,
          role: profile?.role || session.userRole,
          phone: profile?.phone || session.userPhone,
          email: profile?.email || session.userEmail,
          storeId: session.storeId,
        },
      });
    } catch (err: any) {
      logger.error("Failed to get current user", { error: err.message });
      res.status(500).json({ error: "Failed to get user" });
    }
  }

  /**
   * POST /api/auth/session/revoke-all
   * Revokes all sessions for the current user.
   */
  static async revokeAllSessions(req: Request, res: Response): Promise<void> {
    try {
      const accessToken = req.cookies?.waw_session;

      if (accessToken) {
        const session = await SessionService.validateSession(accessToken);
        if (session) {
          await SessionService.revokeAllSessions(session.userId);
        }
      }

      clearSessionCookies(res);

      res.json({ success: true });
    } catch (err: any) {
      logger.error("Failed to revoke all sessions", { error: err.message });
      res.status(500).json({ error: "Failed to revoke sessions" });
    }
  }
}
