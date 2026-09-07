import crypto from "crypto";
import { ENV } from "../../config/env.js";

export class GuestTokenService {
  /**
   * Issues an HMAC-SHA256-signed guest session token for guest checkout.
   *
   * Token format (matches supabase/migrations/019_guest_checkout_rpc.sql):
   *   token = base64(payloadJSON) + "." + base64(HMAC-SHA256(payloadJSON, secret))
   * where payloadJSON = {"phone", "expires_at", "nonce"}.
   * The database reads the secret from current_setting('app.guest_token_secret').
   */
  static issueGuestSessionToken(buyerPhone: string, ttlMinutes = 60): string {
    if (!ENV.GUEST_TOKEN_SECRET) {
      throw new Error("Guest checkout is not configured: GUEST_TOKEN_SECRET is missing");
    }

    const payload = {
      phone: buyerPhone,
      expires_at: new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString(),
      nonce: crypto.randomBytes(24).toString("hex"),
    };

    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64");
    const signature = crypto
      .createHmac("sha256", ENV.GUEST_TOKEN_SECRET)
      .update(payloadB64)
      .digest("base64");

    return `${payloadB64}.${signature}`;
  }
}
