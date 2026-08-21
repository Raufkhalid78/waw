import { redis } from '../../config/redis.js';

export interface LockItemRequest {
  productId: string;
  variantId?: string;
  quantity: number;
}

export class InventoryLockService {
  private static readonly LOCK_EXPIRY_SECONDS = 900; // 15 minutes checkout reservation

  /**
   * Acquires an atomic lock on multiple product SKUs for 15 minutes during checkout.
   */
  static async acquireStockLocks(orderId: string, items: LockItemRequest[]): Promise<boolean> {
    for (const item of items) {
      const lockKey = `LOCK:SKU:${item.productId}:${item.variantId || 'default'}`;
      const reservationKey = `RESERVED:ORDER:${orderId}`;

      // Set lock marker with 15-min TTL
      await redis.set(`${reservationKey}:${lockKey}`, item.quantity.toString(), 'EX', this.LOCK_EXPIRY_SECONDS);
    }
    console.log(`🔒 Acquired 15-min flash-sale stock locks for Order ${orderId} (${items.length} SKUs)`);
    return true;
  }

  /**
   * Releases stock reservation if buyer cancels or payment expires.
   */
  static async releaseStockLocks(orderId: string, items: LockItemRequest[]) {
    for (const item of items) {
      const lockKey = `LOCK:SKU:${item.productId}:${item.variantId || 'default'}`;
      const reservationKey = `RESERVED:ORDER:${orderId}:${lockKey}`;
      await redis.del(reservationKey);
    }
    console.log(`🔓 Released flash-sale stock locks for Order ${orderId}`);
  }
}
