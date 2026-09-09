import crypto from "crypto";
import axios from "axios";
import jwt from "jsonwebtoken";
import { ENV } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { supabaseAdmin } from "../../config/supabase.js";

const FCM_TOKEN_LIFETIME_SECONDS = 3600;
const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const FCM_OAUTH_URL = "https://oauth2.googleapis.com/token";

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Pure dispatch decider: a push may only be attempted when the FCM
 * service-account credentials are fully configured. Exported for
 * deterministic testing without a database.
 */
export function isPushConfigured(input: {
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
}): boolean {
  return Boolean(input.projectId && input.clientEmail && input.privateKey);
}

export class PushService {
  private static cachedAccessToken: { token: string; expiresAt: number } | null = null;

  private static get fcmProjectId(): string | undefined {
    return ENV.FCM_PROJECT_ID;
  }

  /**
   * Exchanges the Firebase service-account JWT for an OAuth access token.
   * Cached until 5 minutes before expiry.
   */
  private static async getAccessToken(): Promise<string | null> {
    if (
      !this.cachedAccessToken ||
      Date.now() >= this.cachedAccessToken.expiresAt
    ) {
      const now = Math.floor(Date.now() / 1000);
      const assertion = jwt.sign(
        {
          iss: ENV.FCM_CLIENT_EMAIL,
          scope: FCM_SCOPE,
          aud: FCM_OAUTH_URL,
          iat: now,
          exp: now + FCM_TOKEN_LIFETIME_SECONDS,
        },
        (ENV.FCM_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
        { algorithm: "RS256" },
      );

      try {
        const res = await axios.post(
          FCM_OAUTH_URL,
          new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion,
          }).toString(),
          { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 10000 },
        );
        this.cachedAccessToken = {
          token: res.data.access_token,
          expiresAt: Date.now() + (res.data.expires_in - 300) * 1000,
        };
      } catch (err: any) {
        logger.warn("FCM access token exchange failed", { error: err?.message });
        return null;
      }
    }
    return this.cachedAccessToken.token;
  }

  /**
   * Sends one push via the Firebase HTTP v1 API. Returns false on any
   * failure — callers never block business flows on notification errors.
   * ownerUserId scopes stale-token cleanup: invalid tokens are removed only
   * for the row(s) belonging to this user (or all rows when the caller is a
   * system sweep that has no ownership context — not used for user fan-out).
   */
  static async sendToToken(
    token: string,
    payload: PushPayload,
    ownerUserId?: string,
  ): Promise<boolean> {
    if (!isPushConfigured(ENV as any)) return false;
    const accessToken = await this.getAccessToken();
    if (!accessToken) return false;

    try {
      const res = await axios.post(
        `https://fcm.googleapis.com/v1/projects/${this.fcmProjectId}/messages:send`,
        {
          message: {
            token,
            notification: { title: payload.title, body: payload.body },
            data: payload.data || {},
            android: { priority: "high" },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        },
      );
      return res.status === 200;
    } catch (err: any) {
      // Unregistered/invalid tokens are removed so stale devices don't
      // accumulate — scoped to the owner where the fan-out knows it.
      const status = err.response?.status;
      if (status === 404 || status === 410) {
        const del = supabaseAdmin.from("device_tokens").delete().eq("token", token);
        if (ownerUserId) del.eq("user_id", ownerUserId);
        await del;
      }
      logger.warn("FCM send failed", { status, error: err?.message });
      return false;
    }
  }

  /**
   * Fan-out: sends to every registered device of a user with bounded
   * concurrency (never serial — a user with N devices cannot make a business
   * event wait N × 10s provider timeouts).
   */
  static async sendToUser(userId: string, payload: PushPayload): Promise<{ sent: number; failed: number }> {
    const { data: rows, error } = await supabaseAdmin
      .from("device_tokens")
      .select("token")
      .eq("user_id", userId);

    if (error || !rows || rows.length === 0) return { sent: 0, failed: 0 };

    const FCM_CONCURRENCY = 5;
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < rows.length; i += FCM_CONCURRENCY) {
      const batch = rows.slice(i, i + FCM_CONCURRENCY);
      const results = await Promise.all(
        batch.map((row) => this.sendToToken(row.token, payload, userId)),
      );
      for (const ok of results) ok ? sent++ : failed++;
    }
    return { sent, failed };
  }

  /**
   * Registers (or refreshes) a device token for an authenticated user.
   */
  static async registerToken(input: {
    userId: string;
    token: string;
    platform?: string;
  }): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from("device_tokens").upsert(
      {
        user_id: input.userId,
        token: input.token,
        platform: input.platform || "android",
        updated_at: now,
      },
      { onConflict: "token" },
    );
    if (error) throw error;
  }

  /**
   * Removes a device token (logout / client-side invalidation). Ownership is
   * enforced: users can only remove their own tokens.
   */
  static async removeToken(input: { userId: string; token: string }): Promise<void> {
    const { error } = await supabaseAdmin
      .from("device_tokens")
      .delete()
      .eq("user_id", input.userId)
      .eq("token", input.token);
    if (error) throw error;
  }
}

export const FCM_PUSH_CONFIGURED = () =>
  isPushConfigured({
    projectId: ENV.FCM_PROJECT_ID,
    clientEmail: ENV.FCM_CLIENT_EMAIL,
    privateKey: ENV.FCM_PRIVATE_KEY,
  });

export const _crypto = crypto;
