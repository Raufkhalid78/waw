import { supabaseAdmin } from "../../config/supabase.js";
import { logger } from "../../config/logger.js";

export interface InventoryBalance {
  offerVariantId: string;
  onHand: number;
  reserved: number;
  available: number;
  lastUpdatedAt: string;
}

/**
 * Authoritative Inventory Balance Service
 * Provides a materialized view of inventory state by computing from the
 * double-entry ledger. Used as the source of truth for stock queries.
 *
 * The balance is computed as:
 *   on_hand = SUM(RESTOCK) + SUM(RETURN_RESTOCK) + SUM(RELEASE)
 *   reserved = ABS(SUM(RESERVE)) where transaction is active
 *   available = on_hand - reserved
 *
 * Negative available indicates overselling and triggers an alert.
 */
export class InventoryBalanceService {
  /**
   * Computes the authoritative inventory balance for a specific variant.
   * This is the single source of truth for stock availability.
   */
  static async getBalance(offerVariantId: string): Promise<InventoryBalance> {
    const { data: ledgerEntries, error } = await supabaseAdmin
      .from("inventory_ledger")
      .select("transaction_type, quantity, reference_id, created_at")
      .eq("offer_variant_id", offerVariantId)
      .order("created_at", { ascending: true });

    if (error) {
      logger.error(`[InventoryBalance] Error fetching ledger for ${offerVariantId}:`, error);
      return {
        offerVariantId,
        onHand: 0,
        reserved: 0,
        available: 0,
        lastUpdatedAt: new Date().toISOString(),
      };
    }

    let onHand = 0;
    let reserved = 0;

    for (const entry of ledgerEntries || []) {
      switch (entry.transaction_type) {
        case "RESTOCK":
        case "RETURN_RESTOCK":
        case "RELEASE":
          onHand += entry.quantity;
          break;
        case "RESERVE":
          // Negative quantity in RESERVE means reserved stock
          reserved += Math.abs(entry.quantity);
          break;
        case "SALE":
          // SALE reduces on_hand (committed sale)
          onHand += entry.quantity; // quantity is negative for SALE
          break;
        case "DAMAGE_ADJUSTMENT":
          // Damage reduces on_hand
          onHand += entry.quantity; // quantity is negative
          break;
        default:
          logger.warn(`[InventoryBalance] Unknown transaction type: ${entry.transaction_type}`);
      }
    }

    const available = onHand - reserved;
    const lastEntry = ledgerEntries?.[ledgerEntries.length - 1];

    if (available < 0) {
      logger.warn(
        `[InventoryBalance] NEGATIVE AVAILABLE STOCK for variant ${offerVariantId}: ${available}. ` +
        `onHand=${onHand}, reserved=${reserved}`,
      );
    }

    return {
      offerVariantId,
      onHand,
      reserved,
      available: Math.max(0, available),
      lastUpdatedAt: lastEntry?.created_at || new Date().toISOString(),
    };
  }

  /**
   * Computes balances for all variants in a store.
   */
  static async getStoreBalances(storeId: string): Promise<InventoryBalance[]> {
    const { data: variants, error } = await supabaseAdmin
      .from("inventory_ledger")
      .select("offer_variant_id")
      .eq("store_id", storeId);

    if (error || !variants) {
      return [];
    }

    const uniqueVariantIds = [...new Set(variants.map((v: any) => v.offer_variant_id))];
    const balances: InventoryBalance[] = [];

    for (const variantId of uniqueVariantIds) {
      const balance = await this.getBalance(variantId);
      balances.push(balance);
    }

    return balances;
  }

  /**
   * Validates that a checkout request can be fulfilled without overselling.
   * Returns the validated items with available quantities.
   */
  static async validateCheckoutItems(
    items: Array<{ offerVariantId: string; quantity: number }>,
  ): Promise<{
    valid: boolean;
    items: Array<{ offerVariantId: string; requested: number; available: number; canFulfill: boolean }>;
    totalInsufficient: number;
  }> {
    const validatedItems = [];
    let totalInsufficient = 0;

    for (const item of items) {
      const balance = await this.getBalance(item.offerVariantId);
      const canFulfill = balance.available >= item.quantity;

      if (!canFulfill) {
        totalInsufficient++;
      }

      validatedItems.push({
        offerVariantId: item.offerVariantId,
        requested: item.quantity,
        available: balance.available,
        canFulfill,
      });
    }

    return {
      valid: totalInsufficient === 0,
      items: validatedItems,
      totalInsufficient,
    };
  }

  /**
   * Records a restock event and returns the new balance.
   */
  static async recordRestock(
    offerVariantId: string,
    storeId: string,
    quantity: number,
    notes?: string,
  ): Promise<InventoryBalance> {
    if (quantity <= 0) {
      throw new Error("Restock quantity must be positive");
    }

    await supabaseAdmin.from("inventory_ledger").insert({
      offer_variant_id: offerVariantId,
      store_id: storeId,
      transaction_type: "RESTOCK",
      quantity: quantity,
      notes: notes || `Restock of ${quantity} units`,
    });

    return this.getBalance(offerVariantId);
  }

  /**
   * Generates a low-stock alert for variants below threshold.
   */
  static async getLowStockAlerts(
    storeId: string,
    threshold: number = 5,
  ): Promise<Array<{ offerVariantId: string; available: number }>> {
    const balances = await this.getStoreBalances(storeId);
    return balances
      .filter((b) => b.available <= threshold && b.available >= 0)
      .map((b) => ({ offerVariantId: b.offerVariantId, available: b.available }));
  }
}
