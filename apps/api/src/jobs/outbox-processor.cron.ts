import { supabaseAdmin } from "../config/supabase.js";
import { logger } from "../config/logger.js";
import { WhatsAppService } from "../modules/notifications/whatsapp.service.js";
import { OutboxService, OutboxEventType } from "../modules/outbox/outbox.service.js";

/**
 * Advisory lock key for distributed outbox processor safety.
 */
const OUTBOX_PROCESSOR_LOCK_KEY = 77777;

async function acquireOutboxLock(): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc("pg_try_advisory_lock", {
    lock_key: OUTBOX_PROCESSOR_LOCK_KEY,
  });
  if (error) {
    logger.warn("Failed to acquire outbox processor lock", { error: error.message });
    return false;
  }
  return data === true;
}

async function releaseOutboxLock(): Promise<void> {
  try {
    await supabaseAdmin.rpc("pg_advisory_unlock", {
      lock_key: OUTBOX_PROCESSOR_LOCK_KEY,
    });
  } catch {
    // Lock auto-releases on connection close
  }
}

/**
 * Processes outbox events and dispatches to appropriate handlers.
 * Uses the transactional outbox pattern for exactly-once delivery.
 */
async function processOutboxEvent(event: {
  id: string;
  eventType: string;
  payload: any;
}): Promise<boolean> {
  try {
    switch (event.eventType as OutboxEventType) {
      case "ORDER_CONFIRMED":
        if (event.payload.buyerPhone && event.payload.orderNumber) {
          await WhatsAppService.sendOrderConfirmed(
            event.payload.buyerPhone,
            event.payload.orderNumber,
            event.payload.totalPkr || 0,
            event.payload.isCod || false,
          );
        }
        break;

      case "ORDER_CANCELLED":
        if (event.payload.buyerPhone && event.payload.orderNumber) {
          await WhatsAppService.sendOrderCancelled(
            event.payload.buyerPhone,
            event.payload.orderNumber,
            event.payload.reason || "Order cancelled",
          );
        }
        break;

      case "RETURN_REQUESTED":
        if (event.payload.buyerPhone && event.payload.orderNumber) {
          await WhatsAppService.sendReturnRequested(
            event.payload.buyerPhone,
            event.payload.orderNumber,
            event.payload.returnId || event.id,
            event.payload.reason || "Return requested",
          );
        }
        break;

      case "PAYMENT_RECEIVED":
        logger.info(`[OutboxProcessor] Payment received event for order ${event.payload.orderId}`);
        break;

      case "PAYMENT_FAILED":
        logger.info(`[OutboxProcessor] Payment failed event for order ${event.payload.orderId}`);
        break;

      case "CHARGEBACK_RECEIVED":
        logger.warn(
          `[OutboxProcessor] CHARGEBACK for Order ${event.payload.orderId}: PKR ${event.payload.amount}`,
        );
        break;

      case "INVENTORY_LOW_STOCK":
        logger.warn(
          `[OutboxProcessor] Low stock alert for variant ${event.payload.offerVariantId}: ${event.payload.available} units`,
        );
        break;

      case "PAYOUT_SCHEDULED":
      case "PAYOUT_SETTLED":
        logger.info(`[OutboxProcessor] Payout event: ${event.eventType} for ${event.payload.payoutId}`);
        break;

      default:
        logger.info(`[OutboxProcessor] Unhandled event type: ${event.eventType}`);
    }

    return true;
  } catch (err: any) {
    logger.error(`[OutboxProcessor] Failed to process event ${event.id}:`, err.message);
    return false;
  }
}

/**
 * Starts the outbox processor cron job.
 * Polls for pending events every 10 seconds with distributed locking.
 */
export function startOutboxProcessorCron() {
  logger.info("Outbox Processor Cron Initialized (10s Interval, Distributed-Lock Enabled)");

  // Run every 10 seconds
  setInterval(async () => {
    await runOutboxProcessor();
  }, 10 * 1000);

  // Also run 5s after startup
  setTimeout(async () => {
    logger.info("Running initial outbox processor check...");
    await runOutboxProcessor();
  }, 5 * 1000);
}

export async function runOutboxProcessor(): Promise<{ processed: number; failed: number }> {
  const lockAcquired = await acquireOutboxLock();
  if (!lockAcquired) {
    return { processed: 0, failed: 0 };
  }

  try {
    const events = await OutboxService.claimPendingEvents(50);

    if (events.length === 0) {
      return { processed: 0, failed: 0 };
    }

    logger.info(`[OutboxProcessor] Processing ${events.length} pending events`);

    let processed = 0;
    let failed = 0;

    for (const event of events) {
      const success = await processOutboxEvent(event);
      if (success) {
        await OutboxService.markCompleted(event.id);
        processed++;
      } else {
        await OutboxService.markFailed(event.id, "Processing failed");
        failed++;
      }
    }

    logger.info(`[OutboxProcessor] Batch complete: ${processed} processed, ${failed} failed`);
    return { processed, failed };
  } catch (err: any) {
    logger.error("[OutboxProcessor] Unexpected error:", err.message);
    return { processed: 0, failed: 0 };
  } finally {
    await releaseOutboxLock();
  }
}
