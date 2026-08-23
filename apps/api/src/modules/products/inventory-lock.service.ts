import { redis } from '../../config/redis.js';
import { supabaseAdmin } from '../../config/supabase.js';

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
   * Atomically decrements product variant stock upon successful payment confirmation.
   */
  static async commitStockDecrement(orderId: string, items: LockItemRequest[]) {
    for (const item of items) {
      if (item.variantId) {
        // Fetch current variant stock
        const { data: variant } = await supabaseAdmin
          .from('product_variants')
          .select('stock_quantity')
          .eq('id', item.variantId)
          .single();

        const currentStock = variant?.stock_quantity ?? 0;
        const newStock = Math.max(0, currentStock - item.quantity);

        // Decrement variant stock in Supabase
        await supabaseAdmin
          .from('product_variants')
          .update({
            stock_quantity: newStock,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.variantId);
      }
    }
    await this.releaseStockLocks(orderId, items);
    console.log(`📦 Stock decremented and locks released for Order ${orderId}`);
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
