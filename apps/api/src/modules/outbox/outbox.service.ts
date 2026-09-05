import { supabaseAdmin } from "../../config/supabase.js";
import { logger } from "../../config/logger.js";

export type OutboxEventType =
  | "ORDER_CONFIRMED"
  | "ORDER_CANCELLED"
  | "ORDER_SHIPPED"
  | "ORDER_DELIVERED"
  | "RETURN_REQUESTED"
  | "RETURN_APPROVED"
  | "RETURN_REJECTED"
  | "PAYOUT_SCHEDULED"
  | "PAYOUT_SETTLED"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_FAILED"
  | "CHARGEBACK_RECEIVED"
  | "INVENTORY_LOW_STOCK"
  | "SELLER_PAYOUT_READY";

export interface OutboxEventPayload {
  orderId?: string;
  orderNumber?: string;
  buyerPhone?: string;
  sellerPhone?: string;
  storeId?: string;
  reason?: string;
  amount?: number;
  [key: string]: any;
}

/**
 * Durable Outbox Pattern Service
 * Ensures notifications and side effects are published reliably by writing
 * them to the database in the same transaction as business state changes.
 * A background worker polls the outbox and dispatches to BullMQ.
 */
export class OutboxService {
  /**
   * Publish an outbox event. Must be called within the same database transaction
   * as the business state change for exactly-once delivery guarantees.
   */
  static async publish(
    eventType: OutboxEventType,
    payload: OutboxEventPayload,
  ): Promise<string | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from("outbox_events")
        .insert({
          event_type: eventType,
          payload: JSON.stringify(payload),
          status: "PENDING",
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (error) {
        logger.error(`[OutboxService] Failed to publish event ${eventType}:`, error);
        return null;
      }

      logger.info(`[OutboxService] Published event ${eventType} (${data.id})`);
      return data.id;
    } catch (err) {
      logger.error(`[OutboxService] Unexpected error publishing ${eventType}:`, err);
      return null;
    }
  }

  /**
   * Claim and process pending outbox events. Called by the background worker.
   * Uses FOR UPDATE SKIP LOCKED for concurrent-safe claiming.
   */
  static async claimPendingEvents(batchSize: number = 50): Promise<
    Array<{ id: string; eventType: string; payload: any }>
  > {
    try {
      const { data: events, error } = await supabaseAdmin.rpc("claim_outbox_events", {
        p_batch_size: batchSize,
      });

      if (error) {
        // Fallback: direct query if RPC doesn't exist
        const { data: fallbackEvents, error: fallbackError } = await supabaseAdmin
          .from("outbox_events")
          .select("id, event_type, payload")
          .eq("status", "PENDING")
          .order("created_at", { ascending: true })
          .limit(batchSize);

        if (fallbackError || !fallbackEvents) {
          logger.error("[OutboxService] Failed to claim events:", fallbackError);
          return [];
        }

        // Mark as PROCESSING
        const ids = fallbackEvents.map((e: any) => e.id);
        if (ids.length > 0) {
          await supabaseAdmin
            .from("outbox_events")
            .update({ status: "PROCESSING" })
            .in("id", ids);
        }

        return fallbackEvents.map((e: any) => ({
          id: e.id,
          eventType: e.event_type,
          payload: typeof e.payload === "string" ? JSON.parse(e.payload) : e.payload,
        }));
      }

      return (events || []).map((e: any) => ({
        id: e.id,
        eventType: e.event_type,
        payload: typeof e.payload === "string" ? JSON.parse(e.payload) : e.payload,
      }));
    } catch (err) {
      logger.error("[OutboxService] Unexpected error claiming events:", err);
      return [];
    }
  }

  /**
   * Mark an outbox event as completed.
   */
  static async markCompleted(eventId: string): Promise<void> {
    try {
      await supabaseAdmin
        .from("outbox_events")
        .update({
          status: "COMPLETED",
          processed_at: new Date().toISOString(),
        })
        .eq("id", eventId);
    } catch (err) {
      logger.error(`[OutboxService] Failed to mark event ${eventId} completed:`, err);
    }
  }

  /**
   * Mark an outbox event as failed with error details.
   */
  static async markFailed(eventId: string, errorMessage: string): Promise<void> {
    try {
      await supabaseAdmin
        .from("outbox_events")
        .update({
          status: "FAILED",
          error_message: errorMessage,
          processed_at: new Date().toISOString(),
        })
        .eq("id", eventId);
    } catch (err) {
      logger.error(`[OutboxService] Failed to mark event ${eventId} failed:`, err);
    }
  }

  /**
   * Purge old completed/failed outbox events (older than specified days).
   */
  static async purgeOldEvents(olderThanDays: number = 7): Promise<number> {
    try {
      const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabaseAdmin
        .from("outbox_events")
        .delete()
        .in("status", ["COMPLETED", "FAILED"])
        .lt("created_at", cutoff)
        .select("id");

      if (error) {
        logger.error("[OutboxService] Failed to purge old events:", error);
        return 0;
      }

      const count = data?.length || 0;
      if (count > 0) {
        logger.info(`[OutboxService] Purged ${count} old outbox events`);
      }
      return count;
    } catch (err) {
      logger.error("[OutboxService] Unexpected error purging events:", err);
      return 0;
    }
  }
}
