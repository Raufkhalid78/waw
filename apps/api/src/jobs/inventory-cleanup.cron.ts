import { supabaseAdmin } from "../config/supabase.js";
import { logger } from "../config/logger.js";
import { AuditService } from "../modules/audit/audit.service.js";
import { ADVISORY_LOCKS } from "../config/advisory-locks.js";

/**
 * Inventory Reservation Auto-Release Worker
 *
 * Every 2 minutes, calls the database RPC `release_expired_checkout_reservations()`
 * which uses FOR UPDATE SKIP LOCKED to atomically:
 *   1. Find PENDING_PAYMENT orders older than 15 minutes
 *   2. Cancel the orders and store_orders
 *   3. Release reserved counts from inventory_snapshots
 *   4. Insert RELEASE entries into inventory_ledger for audit
 *   5. Publish ORDER_CANCELLED outbox events
 *
 * Uses PostgreSQL advisory lock to prevent duplicate execution across replicas.
 */

async function acquireCleanupLock(): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc("pg_try_advisory_lock", {
    lock_key: ADVISORY_LOCKS.INVENTORY_CLEANUP,
  });
  if (error) {
    logger.warn("Failed to acquire inventory cleanup lock", { error: error.message });
    return false;
  }
  return data === true;
}

async function releaseCleanupLock(): Promise<void> {
  try {
    await supabaseAdmin.rpc("pg_advisory_unlock", {
      lock_key: ADVISORY_LOCKS.INVENTORY_CLEANUP,
    });
  } catch {
    // Lock auto-releases on connection close
  }
}

export function startInventoryCleanupCron() {
  logger.info("Inventory Reservation Auto-Release Worker Initialized (2-min Interval, Distributed-Lock Enabled)");

  // Run every 2 minutes
  setInterval(async () => {
    await runInventoryCleanup();
  }, 2 * 60 * 1000);

  // Also run 15s after server startup for immediate cleanup
  setTimeout(async () => {
    logger.info("Running initial startup inventory reservation timeout check...");
    await runInventoryCleanup();
  }, 15 * 1000);
}

export async function runInventoryCleanup(): Promise<{ expired: number; itemsReleased: number }> {
  const lockAcquired = await acquireCleanupLock();
  if (!lockAcquired) {
    return { expired: 0, itemsReleased: 0 };
  }

  try {
    // Call the database-side expiry RPC which uses SKIP LOCKED for safety
    const { data, error } = await supabaseAdmin.rpc(
      "release_expired_checkout_reservations"
    );

    if (error) {
      logger.error("[InventoryCleanup] RPC error:", error.message);
      return { expired: 0, itemsReleased: 0 };
    }

    const result = data as { expired_orders: number; items_released: number };

    if (result.expired_orders > 0) {
      logger.info(
        `[InventoryCleanup] Released ${result.expired_orders} expired checkout reservations, ` +
        `restored ${result.items_released} inventory units`
      );

      await AuditService.logAction({
        actorId: "SYSTEM_WORKER",
        actorRole: "SYSTEM",
        action: "CHECKOUT_RESERVATIONS_EXPIRED_BATCH",
        targetResourceType: "inventory",
        targetResourceId: "batch",
        reason: `${result.expired_orders} orders expired, ${result.items_released} units restored`,
      });
    }

    return {
      expired:       result.expired_orders || 0,
      itemsReleased: result.items_released  || 0,
    };
  } catch (err: any) {
    logger.error("[InventoryCleanup] Unexpected error:", err.message);
    return { expired: 0, itemsReleased: 0 };
  } finally {
    await releaseCleanupLock();
  }
}
