import { redis } from "../../config/redis.js";
import { logger } from "../../config/logger.js";
import { InventoryService } from "./inventory.service.js";
import { supabaseAdmin } from "../../config/supabase.js";

export interface LockItemRequest {
  productId: string;
  variantId?: string;
  quantity: number;
}

export class InventoryLockService {
  private static readonly LOCK_EXPIRY_SECONDS = 900; // 15 minutes checkout reservation

  /**
   * Acquires stock locks by validating available inventory and reserving in Redis.
   * Returns false if any item has insufficient stock.
   *
   * NOTE: This implements a two-phase approach — pessimistic per-item Redis locks
   * prevent concurrent checkouts on the same product, reducing TOCTOU risk.
   * A post-lock secondary stock check provides an additional safety net.
   */
  static async acquireStockLocks(
    orderId: string,
    items: LockItemRequest[],
  ): Promise<boolean> {
    // Phase 1: Acquire pessimistic per-item Redis locks to serialize concurrent checkouts
    const productLockKeys: string[] = [];
    for (const item of items) {
      const productLockKey = `LOCK:CHECKOUT:${item.productId}:${item.variantId || "default"}`;
      const acquired = await redis.set(productLockKey, "1", "NX", "EX", 5);
      if (!acquired) {
        logger.warn(`Could not acquire checkout lock for product ${item.productId} — concurrent checkout in progress`);
        if (productLockKeys.length > 0) {
          try { await redis.del(...productLockKeys); } catch { /* lock TTL will expire */ }
        }
        return false;
      }
      productLockKeys.push(productLockKey);
    }

    try {
      // Phase 2: Validate all items have sufficient stock (now protected by pessimistic lock)
      for (const item of items) {
        const stockAvailable = await InventoryService.getAvailableStock(
          item.productId,
        );
        if (stockAvailable < item.quantity) {
          logger.warn(
            `Insufficient stock for ${item.productId}: available=${stockAvailable}, requested=${item.quantity}`,
          );
          return false;
        }
      }

      // Phase 3: Acquire reservation locks
      const reservationKeys: string[] = [];
      for (const item of items) {
        const lockKey = `LOCK:SKU:${item.productId}:${item.variantId || "default"}`;
        const reservationKey = `RESERVED:ORDER:${orderId}:${lockKey}`;

        try {
          await redis.set(
            reservationKey,
            item.quantity.toString(),
            "EX",
            this.LOCK_EXPIRY_SECONDS,
          );
          reservationKeys.push(reservationKey);
        } catch (err) {
          logger.warn("Redis lock acquisition failed:", err);
          if (reservationKeys.length > 0) {
            try { await redis.del(...reservationKeys); } catch { /* lock TTL will expire */ }
          }
          return false;
        }
      }

      // Phase 4: Secondary stock validation after locks acquired (TOCTOU safety net)
      for (const item of items) {
        const stockAvailable = await InventoryService.getAvailableStock(
          item.productId,
        );
        if (stockAvailable < item.quantity) {
          logger.warn(
            `Post-lock stock check failed for ${item.productId}: available=${stockAvailable}, requested=${item.quantity}`,
          );
          // Release reservation locks we just acquired
          try { await redis.del(...reservationKeys); } catch { /* lock TTL will expire */ }
          return false;
        }
      }

      return true;
    } finally {
      // Release pessimistic checkout locks (short-lived, but release early)
      try { await redis.del(...productLockKeys); } catch { /* lock TTL will expire */ }
    }
  }

  /**
   * Finalizes stock deductions and cleans up lock markers upon confirmed payment.
   */
  static async commitStockDecrement(orderId: string, items: LockItemRequest[]) {
    // In canonical commerce architecture, checkout_transaction already inserted the RESERVE
    // entry into inventory_ledger. When payment succeeds, we simply release the ephemeral Redis locks.
    await this.releaseStockLocks(orderId, items);
    logger.info(
      `Stock reservation confirmed and locks finalized for Order ${orderId}`,
    );
  }

  /**
   * Releases stock reservation if buyer cancels or payment expires.
   */
  static async releaseStockLocks(
    orderId: string,
    items?: LockItemRequest[],
  ) {
    // 1. Release in double-entry inventory ledger
    await InventoryService.releaseOrderReservation(orderId);

    // 2. Clean up Redis markers using SCAN instead of KEYS
    if (items) {
      for (const item of items) {
        const lockKey = `LOCK:SKU:${item.productId}:${item.variantId || "default"}`;
        const reservationKey = `RESERVED:ORDER:${orderId}:${lockKey}`;
        try {
          await redis.del(reservationKey);
        } catch { /* reservation TTL will expire */ }
      }
    }
  }
}
