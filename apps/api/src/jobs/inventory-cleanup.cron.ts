import { supabaseAdmin } from "../config/supabase.js";
import { logger } from "../config/logger.js";
import { InventoryService } from "../modules/products/inventory.service.js";
import { AuditService } from "../modules/audit/audit.service.js";

/**
 * Advisory lock key for distributed inventory cleanup safety.
 */
const INVENTORY_CLEANUP_LOCK_KEY = 54321;

/**
 * Acquires a PostgreSQL advisory lock for distributed cron safety.
 */
async function acquireCleanupLock(): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc("pg_try_advisory_lock", {
    lock_key: INVENTORY_CLEANUP_LOCK_KEY,
  });
  if (error) {
    logger.warn("Failed to acquire inventory cleanup lock, skipping", { error: error.message });
    return false;
  }
  return data === true;
}

/**
 * Releases the PostgreSQL advisory lock.
 */
async function releaseCleanupLock(): Promise<void> {
  try {
    await supabaseAdmin.rpc("pg_advisory_unlock", {
      lock_key: INVENTORY_CLEANUP_LOCK_KEY,
    });
  } catch {
    // Lock auto-releases on connection close
  }
}

/**
 * Periodically scans for unpaid orders older than 15 minutes and
 * automatically releases their double-entry inventory reservations back to the catalog.
 * Uses PostgreSQL advisory lock to prevent duplicate execution across replicas.
 */
export function startInventoryCleanupCron() {
  logger.info("⏱️ Inventory Reservation Auto-Release Worker Initialized (2-min Interval, Distributed-Lock Enabled)");

  // Run every 2 minutes
  setInterval(async () => {
    await runInventoryCleanup();
  }, 2 * 60 * 1000);

  // Also run 15s after server startup for immediate cleanup
  setTimeout(async () => {
    logger.info("🔄 Running initial startup inventory reservation timeout check...");
    await runInventoryCleanup();
  }, 15 * 1000);
}

export async function runInventoryCleanup() {
  // P0-6: Acquire distributed lock
  const lockAcquired = await acquireCleanupLock();
  if (!lockAcquired) {
    return; // Another worker is handling this
  }

  try {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    // Find orders still awaiting payment older than 15 minutes
    const { data: expiredOrders, error } = await supabaseAdmin
      .from("orders")
      .select("id, buyer_phone, created_at")
      .eq("global_status", "PENDING_PAYMENT")
      .lt("created_at", fifteenMinutesAgo);

    if (error) {
      logger.error("❌ [InventoryCleanup] Error querying expired orders:", error.message);
      return;
    }

    if (!expiredOrders || expiredOrders.length === 0) {
      return;
    }

    logger.info(`🧹 [InventoryCleanup] Found ${expiredOrders.length} expired unpaid checkout reservations. Processing releases...`);

    for (const order of expiredOrders) {
      // 1. Release reserved stock back to catalog via double-entry ledger
      await InventoryService.releaseOrderReservation(
        order.id,
        "15-minute unpaid checkout reservation timeout",
        "SYSTEM_WORKER",
      );

      // 2. Mark parent order as CANCELLED
      await supabaseAdmin
        .from("orders")
        .update({
          global_status: "CANCELLED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      // 3. Mark child store orders as CANCELLED
      await supabaseAdmin
        .from("store_orders")
        .update({
          status: "CANCELLED",
          updated_at: new Date().toISOString(),
        })
        .eq("order_id", order.id);

      // 4. Record audit log
      await AuditService.logAction({
        actorId: "SYSTEM_WORKER",
        actorRole: "SYSTEM",
        action: "ORDER_AUTO_CANCELLED_TIMEOUT",
        targetResourceType: "order",
        targetResourceId: order.id,
        reason: "Unpaid checkout session expired after 15 minutes",
      });

      logger.info(`✅ [InventoryCleanup] Auto-cancelled expired Order ${order.id} and restored inventory balance`);
    }
  } catch (err: any) {
    logger.error("❌ [InventoryCleanup] Unexpected error in inventory cleanup job:", err.message);
  } finally {
    await releaseCleanupLock();
  }
}
