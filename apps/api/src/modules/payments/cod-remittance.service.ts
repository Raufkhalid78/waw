import axios from "axios";
import { ENV } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { supabaseAdmin } from "../../config/supabase.js";

export type RemittanceDecision = "mark_paid" | "keep_awaiting" | "unknown";

/**
 * Pure remittance decision: maps a provider remittance status to the order
 * state action. Exported for deterministic testing without a database.
 *
 * Only an EXPLICIT provider confirmation marks cash as received. Absence,
 * errors, and unrecognised payloads are "unknown" — the order stays in
 * AWAITING_COD_REMITTANCE for the next cycle. Cash confirmation is never
 * simulated.
 */
export function decideRemittanceUpdate(providerRemitted: unknown): RemittanceDecision {
  if (providerRemitted === true) return "mark_paid";
  if (providerRemitted === false) return "keep_awaiting";
  return "unknown";
}

/**
 * Pure payout gate: a COD seller payout may only settle once the parent
 * order's cash has been confirmed remitted (payment_status PAID). Exported
 * for deterministic testing without a database.
 */
export function shouldHoldCodPayout(orderPaymentStatus: unknown): boolean {
  return String(orderPaymentStatus || "") === "AWAITING_COD_REMITTANCE";
}

export class CodRemittanceService {
  /**
   * Queries the PostEx remittance status for a delivered COD consignment.
   * Returns true/false per the provider, or null when the provider is
   * unreachable or the payload is unrecognised (never guessed).
   */
  static async checkPostExRemittance(orderNumber: string): Promise<boolean | null> {
    if (!ENV.POSTEX_API_TOKEN) {
      logger.warn("PostEx remittance check skipped: POSTEX_API_TOKEN not set", {
        orderNumber,
      });
      return null;
    }

    try {
      const res = await axios.get(
        `${ENV.POSTEX_API_BASE}/order/v1/remittance-status`,
        {
          params: { orderRef: orderNumber },
          headers: { token: ENV.POSTEX_API_TOKEN },
          timeout: 5000,
        },
      );

      const data = (res.data ?? {}) as Record<string, unknown>;
      const nested = (data.data ?? {}) as Record<string, unknown>;
      const value = data.isRemitted ?? data.remitted ?? nested.isRemitted;
      if (typeof value === "boolean") return value;

      logger.warn("PostEx remittance response not recognised", {
        orderNumber,
        keys: Object.keys(data),
      });
      return null;
    } catch (err: any) {
      logger.warn("PostEx remittance check failed", {
        orderNumber,
        error: err?.message,
      });
      return null;
    }
  }

  /**
   * Applies a confirmed remittance: transitions the COD order to PAID and
   * records the cash arrival in the financial ledger for audit.
   */
  static async markRemitted(order: {
    id: string;
    order_number: string;
    total_amount_pkr?: number | null;
  }): Promise<void> {
    const now = new Date().toISOString();

    await supabaseAdmin
      .from("orders")
      .update({ payment_status: "PAID", updated_at: now })
      .eq("id", order.id)
      .eq("payment_status", "AWAITING_COD_REMITTANCE");

    await supabaseAdmin.from("financial_ledger").insert({
      transaction_type: "COD_REMITTED",
      amount_pkr: Number(order.total_amount_pkr || 0),
      entry_type: "CREDIT",
      reference_id: order.id,
      description: `PostEx confirmed COD cash remittance for Order ${order.order_number}`,
    });
  }
}
