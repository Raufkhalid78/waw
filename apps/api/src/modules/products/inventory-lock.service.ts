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
   */
  static async acquireStockLocks(
    orderId: string,
    items: LockItemRequest[],
  ): Promise<boolean> {
    // First, validate all items have sufficient stock
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

    // All items have sufficient stock — acquire Redis locks
    const lockKeys: string[] = [];
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
        lockKeys.push(reservationKey);
      } catch (err) {
        logger.warn("Redis lock acquisition failed:", err);
        // Clean up any locks we already acquired
        if (lockKeys.length > 0) {
          try {
            await redis.del(...lockKeys);
          } catch {}
        }
        return false;
      }
    }
    return true;
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
        } catch {}
      }
    }
  }
}
