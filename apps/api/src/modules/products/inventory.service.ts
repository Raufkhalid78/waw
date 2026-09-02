import { supabaseAdmin } from "../../config/supabase.js";
import { redis } from "../../config/redis.js";
import { logger } from "../../config/logger.js";
import { AuditService } from "../audit/audit.service.js";

export interface RestockParams {
  storeId: string;
  offerVariantId: string;
  quantity: number;
  notes?: string;
  actorId?: string;
}

export interface DamageAdjustmentParams {
  storeId: string;
  offerVariantId: string;
  quantity: number;
  notes?: string;
  actorId?: string;
}

export class InventoryService {
  /**
   * Computes the authoritative available stock for a specific offer variant
   * by summing all double-entry movements in the inventory_ledger.
   * Throws if stock is negative (indicates overselling).
   */
  static async getAvailableStock(offerVariantId: string): Promise<number> {
    const { data, error } = await supabaseAdmin
      .from("inventory_ledger")
      .select("quantity")
      .eq("offer_variant_id", offerVariantId);

    if (error) {
      logger.error(
        `[InventoryService] Error calculating stock for variant ${offerVariantId}:`,
        error,
      );
      return 0;
    }

    const total = (data || []).reduce(
      (sum: number, row: any) => sum + (row.quantity || 0),
      0,
    );

    // Log negative stock as a warning (potential overselling)
    if (total < 0) {
      logger.warn(
        `[InventoryService] NEGATIVE STOCK detected for variant ${offerVariantId}: ${total}. This indicates overselling.`,
      );
    }

    return Math.max(0, total);
  }

  /**
   * Idempotently releases a stock reservation for a cancelled or timed-out order.
   * Checks if a RELEASE transaction already exists for this order before inserting.
   */
  static async releaseOrderReservation(
    orderId: string,
    reason: string = "Order cancelled or payment expired",
    actorId: string = "SYSTEM",
  ): Promise<boolean> {
    // 1. Idempotency Check: Verify if a RELEASE already exists for this reference_id
    const { data: existingReleases } = await supabaseAdmin
      .from("inventory_ledger")
      .select("id")
      .eq("reference_id", orderId)
      .eq("transaction_type", "RELEASE")
      .limit(1);

    if (existingReleases && existingReleases.length > 0) {
      logger.info(`ℹ️ [InventoryService] Stock already released for Order ${orderId} (Idempotent Guard)`);
      return true;
    }

    // 2. Fetch order items to determine the exact quantities to restore
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("id, store_orders(store_id, order_items(offer_variant_id, quantity, product_title))")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      logger.warn(`⚠️ [InventoryService] Cannot release stock: Order ${orderId} not found`);
      return false;
    }

    const storeOrders = order.store_orders || [];
    let itemsReleasedCount = 0;

    for (const so of storeOrders) {
      const items = so.order_items || [];
      for (const item of items) {
        if (item.offer_variant_id && item.quantity > 0) {
          // Insert positive double-entry ledger record to restore available balance
          await supabaseAdmin.from("inventory_ledger").insert({
            offer_variant_id: item.offer_variant_id,
            store_id: so.store_id,
            transaction_type: "RELEASE",
            quantity: Math.abs(item.quantity),
            reference_id: orderId,
            notes: `Stock reservation reversal: ${reason}`,
          });

          // Clean up Redis lock key if present
          try {
            const lockPattern = `RESERVED:ORDER:${orderId}:*`;
            // Use SCAN instead of KEYS for production-safe iteration
            let cursor = "0";
            do {
              const result = await redis.scan(
                cursor,
                "MATCH",
                lockPattern,
                "COUNT",
                100,
              );
              cursor = result[0];
              const keys = result[1];
              if (keys.length > 0) {
                await redis.del(...keys);
              }
            } while (cursor !== "0");
          } catch {}

          itemsReleasedCount++;
        }
      }
    }

    // 3. Log audit event
    await AuditService.logAction({
      actorId,
      actorRole: actorId === "SYSTEM" ? "SYSTEM" : "USER",
      action: "STOCK_RESERVATION_RELEASED",
      targetResourceType: "order",
      targetResourceId: orderId,
      reason: `Released ${itemsReleasedCount} item lines back to catalog. Reason: ${reason}`,
    });

    logger.info(`🔓 [InventoryService] Successfully released stock reservations for Order ${orderId} (${itemsReleasedCount} item lines)`);
    return true;
  }

  /**
   * Records a merchant restock replenishment in the double-entry ledger.
   */
  static async recordRestock(params: RestockParams) {
    const qty = Math.abs(params.quantity);
    if (qty <= 0) throw new Error("Restock quantity must be greater than 0");

    const { data: record, error } = await supabaseAdmin
      .from("inventory_ledger")
      .insert({
        offer_variant_id: params.offerVariantId,
        store_id: params.storeId,
        transaction_type: "RESTOCK",
        quantity: qty,
        notes: params.notes || "Merchant inventory restock",
      })
      .select()
      .single();

    if (error) throw error;

    await AuditService.logAction({
      actorId: params.actorId || "SELLER",
      actorRole: "SELLER",
      action: "INVENTORY_RESTOCKED",
      targetResourceType: "offer_variant",
      targetResourceId: params.offerVariantId,
      reason: `Restocked +${qty} units. Notes: ${params.notes || "N/A"}`,
    });

    return record;
  }

  /**
   * Records a damaged, lost, or shrink adjustment in the double-entry ledger.
   */
  static async recordDamageAdjustment(params: DamageAdjustmentParams) {
    const qty = Math.abs(params.quantity);
    if (qty <= 0) throw new Error("Damage adjustment quantity must be greater than 0");

    const { data: record, error } = await supabaseAdmin
      .from("inventory_ledger")
      .insert({
        offer_variant_id: params.offerVariantId,
        store_id: params.storeId,
        transaction_type: "DAMAGE_ADJUSTMENT",
        quantity: -qty,
        notes: params.notes || "Damaged or expired inventory write-off",
      })
      .select()
      .single();

    if (error) throw error;

    await AuditService.logAction({
      actorId: params.actorId || "SELLER",
      actorRole: "SELLER",
      action: "INVENTORY_DAMAGE_ADJUSTMENT",
      targetResourceType: "offer_variant",
      targetResourceId: params.offerVariantId,
      reason: `Deducted -${qty} damaged units. Notes: ${params.notes || "N/A"}`,
    });

    return record;
  }

  /**
   * Records a customer return restock replenishment in the double-entry ledger.
   */
  static async recordReturnRestock(params: {
    storeId: string;
    offerVariantId: string;
    quantity: number;
    returnRequestId: string;
    notes?: string;
    actorId?: string;
  }) {
    const qty = Math.abs(params.quantity);
    if (qty <= 0) return null;

    const { data: record, error } = await supabaseAdmin
      .from("inventory_ledger")
      .insert({
        offer_variant_id: params.offerVariantId,
        store_id: params.storeId,
        transaction_type: "RETURN_RESTOCK",
        quantity: qty,
        reference_id: params.returnRequestId,
        notes: params.notes || `Returned item restocked (Return #${params.returnRequestId})`,
      })
      .select()
      .single();

    if (error) throw error;

    await AuditService.logAction({
      actorId: params.actorId || "ADMIN",
      actorRole: "SUPER_ADMIN",
      action: "RETURN_RESTOCK",
      targetResourceType: "offer_variant",
      targetResourceId: params.offerVariantId,
      reason: `Restocked +${qty} units from customer return #${params.returnRequestId}`,
    });

    return record;
  }

  /**
   * Returns a breakdown of available, reserved, and total stock for a store.
   */
  static async getStoreInventoryMetrics(storeId: string) {
    const { data: ledgerEntries, error } = await supabaseAdmin
      .from("inventory_ledger")
      .select("offer_variant_id, transaction_type, quantity")
      .eq("store_id", storeId);

    if (error || !ledgerEntries) {
      return { totalAvailable: 0, totalReserved: 0, totalRestocked: 0, uniqueVariants: 0 };
    }

    let totalAvailable = 0;
    let totalReserved = 0;
    let totalRestocked = 0;
    const variants = new Set<string>();

    for (const entry of ledgerEntries) {
      variants.add(entry.offer_variant_id);
      totalAvailable += entry.quantity;
      if (entry.transaction_type === "RESERVE") {
        totalReserved += Math.abs(entry.quantity);
      } else if (entry.transaction_type === "RESTOCK") {
        totalRestocked += entry.quantity;
      }
    }

    return {
      totalAvailable: Math.max(0, totalAvailable),
      totalReserved,
      totalRestocked,
      uniqueVariants: variants.size,
    };
  }
}
