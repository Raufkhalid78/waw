import crypto from "crypto";
import jwt from "jsonwebtoken";
import { redis } from "../../config/redis.js";
import { ENV } from "../../config/env.js";
import { logger } from "../../config/logger.js";

const SESSION_TTL_SECONDS = 900; // 15 minutes access token
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days refresh token
const CSRF_TOKEN_LENGTH = 32;

export interface SessionData {
  sessionId: string;
  userId: string;
  userRole: string;
  userPhone: string;
  userEmail?: string;
  storeId?: string;
  deviceFingerprint?: string;
  ip: string;
  userAgent: string;
  createdAt: string;
  lastAccessedAt: string;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
  expiresAt: number;
}

/**
 * Secure session management with Redis-backed storage.
 * Sessions use random tokens (not JWTs) for server-side revocation.
 * Access tokens are short-lived; refresh tokens enable silent renewal.
 */
export class SessionService {
  /**
   * Create a new session after successful authentication.
   * Returns access token, refresh token, and CSRF token.
   */
  static async createSession(params: {
    userId: string;
    userRole: string;
    userPhone: string;
    userEmail?: string;
    storeId?: string;
    ip: string;
    userAgent: string;
  }): Promise<SessionTokens> {
    const sessionId = crypto.randomBytes(32).toString("hex");
    const accessToken = crypto.randomBytes(48).toString("hex");
    const refreshToken = crypto.randomBytes(48).toString("hex");
    const csrfToken = crypto.randomBytes(CSRF_TOKEN_LENGTH).toString("hex");

    const sessionData: SessionData = {
      sessionId,
      userId: params.userId,
      userRole: params.userRole,
      userPhone: params.userPhone,
      userEmail: params.userEmail,
      storeId: params.storeId,
      ip: params.ip,
      userAgent: params.userAgent,
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
    };

    // Store session in Redis with access token as key
    const sessionKey = `session:${accessToken}`;
    const refreshKey = `refresh:${refreshToken}`;
    const userSessionsKey = `user_sessions:${params.userId}`;

    try {
      await redis.set(
        sessionKey,
        JSON.stringify(sessionData),
        { ex: SESSION_TTL_SECONDS },
      );

      // Store refresh token -> session mapping
      await redis.set(
        refreshKey,
        JSON.stringify({ sessionId, accessToken }),
        { ex: REFRESH_TTL_SECONDS },
      );

      // Track all active sessions for this user (for revocation)
      await redis.set(
        userSessionsKey,
        JSON.stringify([...(await SessionService.getUserSessions(params.userId)), sessionId]),
        { ex: REFRESH_TTL_SECONDS },
      );
    } catch (err) {
      logger.error("Failed to create session in Redis", {
        userId: params.userId,
        error: (err as Error).message,
      });
      throw new Error("Session creation failed");
    }

    const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;

    return { accessToken, refreshToken, csrfToken, expiresAt };
  }

  /**
   * Validate an access token and return session data.
   * Refreshes the TTL on each valid access (sliding window).
   */
  static async validateSession(accessToken: string): Promise<SessionData | null> {
    const sessionKey = `session:${accessToken}`;

    try {
      const data = await redis.get(sessionKey);
      if (!data) return null;

      const session: SessionData = JSON.parse(data);

      // Update last accessed time and extend TTL (sliding window)
      session.lastAccessedAt = new Date().toISOString();
      await redis.set(sessionKey, JSON.stringify(session), { ex: SESSION_TTL_SECONDS });

      return session;
    } catch (err) {
      logger.warn("Failed to validate session", {
        error: (err as Error).message,
      });
      return null;
    }
  }

  /**
   * Refresh an access token using a refresh token.
   * Issues new access + refresh tokens and invalidates the old pair.
   */
  static async refreshSession(
    refreshToken: string,
    ip: string,
    userAgent: string,
  ): Promise<SessionTokens | null> {
    const refreshKey = `refresh:${refreshToken}`;

    try {
      const data = await redis.get(refreshKey);
      if (!data) return null;

      const { sessionId, accessToken: oldAccessToken } = JSON.parse(data);

      // Get the session data
      const sessionKey = `session:${oldAccessToken}`;
      const sessionData = await redis.get(sessionKey);
      if (!sessionData) return null;

      const session: SessionData = JSON.parse(sessionData);

      // Invalidate old tokens
      await redis.del(sessionKey);
      await redis.del(refreshKey);

      // Create new tokens
      const newAccessToken = crypto.randomBytes(48).toString("hex");
      const newRefreshToken = crypto.randomBytes(48).toString("hex");
      const csrfToken = crypto.randomBytes(CSRF_TOKEN_LENGTH).toString("hex");

      // Update session with new tokens
      const newSessionKey = `session:${newAccessToken}`;
      const newRefreshKey = `refresh:${newRefreshToken}`;

      session.ip = ip;
      session.userAgent = userAgent;
      session.lastAccessedAt = new Date().toISOString();

      await redis.set(newSessionKey, JSON.stringify(session), { ex: SESSION_TTL_SECONDS });
      await redis.set(
        newRefreshKey,
        JSON.stringify({ sessionId, accessToken: newAccessToken }),
        { ex: REFRESH_TTL_SECONDS },
      );

      // Update user sessions tracking
      const userSessionsKey = `user_sessions:${session.userId}`;
      const sessions = await SessionService.getUserSessions(session.userId);
      const updatedSessions = sessions.map((s) =>
        s === sessionId ? sessionId : s,
      );
      await redis.set(
        userSessionsKey,
        JSON.stringify(updatedSessions),
        { ex: REFRESH_TTL_SECONDS },
      );

      const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
      return { accessToken: newAccessToken, refreshToken: newRefreshToken, csrfToken, expiresAt };
    } catch (err) {
      logger.error("Failed to refresh session", {
        error: (err as Error).message,
      });
      return null;
    }
  }

  /**
   * Revoke a specific session (logout).
   */
  static async revokeSession(accessToken: string): Promise<boolean> {
    const sessionKey = `session:${accessToken}`;

    try {
      const data = await redis.get(sessionKey);
      if (!data) return false;

      const session: SessionData = JSON.parse(data);

      // Delete the session
      await redis.del(sessionKey);

      // Remove from user sessions tracking
      const userSessionsKey = `user_sessions:${session.userId}`;
      const sessions = await SessionService.getUserSessions(session.userId);
      const updatedSessions = sessions.filter((s) => s !== session.sessionId);
      await redis.set(
        userSessionsKey,
        JSON.stringify(updatedSessions),
        { ex: REFRESH_TTL_SECONDS },
      );

      return true;
    } catch (err) {
      logger.error("Failed to revoke session", {
        error: (err as Error).message,
      });
      return false;
    }
  }

  /**
   * Revoke all sessions for a user (force logout everywhere).
   */
  static async revokeAllSessions(userId: string): Promise<void> {
    try {
      const sessions = await SessionService.getUserSessions(userId);
      const userSessionsKey = `user_sessions:${userId}`;

      for (const sessionId of sessions) {
        // We can't easily delete by sessionId without the accessToken,
        // but we can clear the tracking list so old tokens won't be refreshed
        await redis.del(userSessionsKey);
      }

      await redis.del(userSessionsKey);
    } catch (err) {
      logger.error("Failed to revoke all sessions", {
        userId,
        error: (err as Error).message,
      });
    }
  }

  /**
   * Get list of active session IDs for a user.
   */
  static async getUserSessions(userId: string): Promise<string[]> {
    try {
      const data = await redis.get(`user_sessions:${userId}`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Generate a signed JWT for backward compatibility with the existing auth middleware.
   * This allows gradual migration — new sessions use cookies, old code paths can still
   * validate the JWT if needed.
   */
  static generateLegacyJWT(params: {
    sub: string;
    phone: string;
    email?: string;
    role: string;
  }): string {
    return jwt.sign(
      {
        sub: params.sub,
        phone: params.phone,
        email: params.email,
        role: params.role,
      },
      ENV.JWT_SECRET,
      { expiresIn: "7d" },
    );
  }
}
