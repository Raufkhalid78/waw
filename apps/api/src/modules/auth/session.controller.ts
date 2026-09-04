import { Request, Response } from "express";
import { SessionService } from "./session.service.js";
import { setCsrfCookie, generateCsrfToken } from "../../middleware/csrf.middleware.js";
import { logger } from "../../config/logger.js";

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
   * POST /api/auth/session/create
   * Creates a new session after successful authentication.
   * Called by the login page after OTP/email verification succeeds.
   */
  static async createSession(req: Request, res: Response): Promise<void> {
    try {
      const { userId, userRole, userPhone, userEmail, storeId } = req.body;

      if (!userId || !userRole) {
        res.status(400).json({ error: "userId and userRole are required" });
        return;
      }

      const ip = req.ip || req.socket.remoteAddress || "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";

      const tokens = await SessionService.createSession({
        userId,
        userRole,
        userPhone: userPhone || "",
        userEmail,
        storeId,
        ip,
        userAgent,
      });

      setSessionCookies(res, tokens.accessToken, tokens.refreshToken, tokens.csrfToken);

      res.json({
        success: true,
        user: { id: userId, role: userRole, phone: userPhone, email: userEmail },
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
      const refreshToken = req.cookies?.waw_refresh;

      if (!refreshToken) {
        res.status(401).json({ error: "No refresh token found" });
        return;
      }

      const ip = req.ip || req.socket.remoteAddress || "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";

      const tokens = await SessionService.refreshSession(refreshToken, ip, userAgent);

      if (!tokens) {
        clearSessionCookies(res);
        res.status(401).json({ error: "Session expired or invalid" });
        return;
      }

      setSessionCookies(res, tokens.accessToken, tokens.refreshToken, tokens.csrfToken);

      res.json({
        success: true,
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
      const accessToken = req.cookies?.waw_session;

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
      const accessToken = req.cookies?.waw_session;

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

      res.json({
        user: {
          id: session.userId,
          role: session.userRole,
          phone: session.userPhone,
          email: session.userEmail,
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
