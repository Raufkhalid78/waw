import { supabaseAdmin } from "../../config/supabase.js";
import { logger } from "../../config/logger.js";

export type CheckoutSessionStatus = "pending" | "committed" | "failed";

export interface CheckoutSession {
  id: string;
  quote_token: string;
  buyer_id: string | null;
  buyer_phone: string;
  status: CheckoutSessionStatus;
  order_id: string | null;
  idempotency_key: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Durable checkout session manager.
 * Replaces Redis-only quote consumption with database-backed sessions
 * that survive restarts and provide atomic idempotency.
 */
export class CheckoutSessionService {
  /**
   * Begin a checkout session. Returns existing session if quote token
   * or idempotency key already has a committed/active session.
   */
  static async beginSession(params: {
    quoteToken: string;
    buyerId?: string;
    buyerPhone: string;
    idempotencyKey?: string;
  }): Promise<{ session: CheckoutSession; isDuplicate: boolean }> {
    const { quoteToken, buyerId, buyerPhone, idempotencyKey } = params;

    // Check for existing committed session (idempotent return)
    const { data: existing } = await supabaseAdmin
      .from("checkout_sessions")
      .select("*")
      .eq("quote_token", quoteToken)
      .eq("status", "committed")
      .maybeSingle();

    if (existing) {
      logger.info("Checkout session already committed, returning existing", {
        sessionId: existing.id,
        orderId: existing.order_id,
      });
      return { session: existing as CheckoutSession, isDuplicate: true };
    }

    // Check by idempotency key
    if (idempotencyKey) {
      const { data: existingByIdempotency } = await supabaseAdmin
        .from("checkout_sessions")
        .select("*")
        .eq("idempotency_key", idempotencyKey)
        .in("status", ["pending", "committed"])
        .maybeSingle();

      if (existingByIdempotency) {
        logger.info("Checkout session found by idempotency key", {
          sessionId: existingByIdempotency.id,
          status: existingByIdempotency.status,
        });
        return {
          session: existingByIdempotency as CheckoutSession,
          isDuplicate: existingByIdempotency.status === "committed",
        };
      }
    }

    // Create new pending session
    const { data: session, error } = await supabaseAdmin
      .from("checkout_sessions")
      .insert({
        quote_token: quoteToken,
        buyer_id: buyerId || null,
        buyer_phone: buyerPhone,
        status: "pending",
        idempotency_key: idempotencyKey || null,
      })
      .select()
      .single();

    if (error) {
      // Race condition: another request created the session first
      if (error.code === "23505") {
        const { data: raceSession } = await supabaseAdmin
          .from("checkout_sessions")
          .select("*")
          .eq("quote_token", quoteToken)
          .maybeSingle();

        if (raceSession) {
          return {
            session: raceSession as CheckoutSession,
            isDuplicate: raceSession.status === "committed",
          };
        }
      }
      throw new Error(`Failed to create checkout session: ${error.message}`);
    }

    return { session: session as CheckoutSession, isDuplicate: false };
  }

  /**
   * Mark session as committed with the created order ID.
   * This is the atomic idempotency boundary.
   */
  static async commitSession(
    sessionId: string,
    orderId: string,
  ): Promise<void> {
    const { error } = await supabaseAdmin
      .from("checkout_sessions")
      .update({
        status: "committed",
        order_id: orderId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("status", "pending"); // Optimistic lock: only commit if still pending

    if (error) {
      throw new Error(`Failed to commit checkout session: ${error.message}`);
    }
  }

  /**
   * Mark session as failed (e.g., RPC error, validation failure).
   * Allows retry with a new session.
   */
  static async failSession(sessionId: string, reason?: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("checkout_sessions")
      .update({
        status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("status", "pending");

    if (error) {
      logger.error("Failed to mark checkout session as failed", {
        sessionId,
        error: error.message,
      });
    }
  }

  /**
   * Clean up expired pending sessions (run as a cron job).
   */
  static async cleanupExpiredSessions(): Promise<number> {
    const { data, error } = await supabaseAdmin
      .from("checkout_sessions")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("status", "pending")
      .lt("expires_at", new Date().toISOString())
      .select();

    if (error) {
      logger.error("Failed to cleanup expired checkout sessions", {
        error: error.message,
      });
      return 0;
    }

    return data?.length || 0;
  }
}
