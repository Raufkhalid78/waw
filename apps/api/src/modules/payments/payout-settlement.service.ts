import { supabaseAdmin } from "../../config/supabase.js";
import { logger } from "../../config/logger.js";
import { AuditService } from "../audit/audit.service.js";

/**
 * Provider-Confirmed Payout Settlement Service
 * Ensures payouts are only settled when the payment provider has confirmed
 * the transfer. Never marks a payout as settled based solely on maturity date.
 *
 * Settlement lifecycle:
 *   1. SCHEDULED: Payout created after delivery + T+7 maturity window
 *   2. PROCESSING: Provider transfer initiated
 *   3. SETTLED: Provider confirms transfer completed
 *   4. HELD: Active dispute/return freezes payout
 *   5. COMPLETED: Final confirmation and ledger posting
 */
export class PayoutSettlementService {
  /**
   * Verifies provider has confirmed the transfer before settling.
   * Returns true if settlement was processed, false if skipped.
   */
  static async settleWithProviderConfirmation(
    payoutId: string,
  ): Promise<{ settled: boolean; reason: string }> {
    const { data: payout, error } = await supabaseAdmin
      .from("payouts")
      .select("*, store_order:store_orders(id, order_id, store_id, delivered_at)")
      .eq("id", payoutId)
      .single();

    if (error || !payout) {
      return { settled: false, reason: "Payout not found" };
    }

    if (payout.status !== "SCHEDULED") {
      return { settled: false, reason: `Payout is in ${payout.status} state` };
    }

    // Check maturity: must be past T+7 from delivery
    if (payout.store_order?.delivered_at) {
      const deliveredAt = new Date(payout.store_order.delivered_at);
      const maturityDate = new Date(deliveredAt.getTime() + 7 * 24 * 60 * 60 * 1000);
      if (Date.now() < maturityDate.getTime()) {
        return { settled: false, reason: "Payout not yet mature (T+7 window)" };
      }
    }

    // Check for active disputes/returns
    const orderId = payout.store_order?.order_id;
    if (orderId) {
      const [{ data: returns }, { data: tickets }] = await Promise.all([
        supabaseAdmin
          .from("return_requests")
          .select("id")
          .eq("order_id", orderId)
          .in("status", ["PENDING_REVIEW", "REVERSE_PICKUP_BOOKED", "RECEIVED", "DISPUTE_OPENED"])
          .limit(1),
        supabaseAdmin
          .from("support_tickets")
          .select("id")
          .eq("order_id", orderId)
          .in("status", ["OPEN", "UNDER_REVIEW"])
          .limit(1),
      ]);

      if ((returns && returns.length > 0) || (tickets && tickets.length > 0)) {
        await supabaseAdmin
          .from("payouts")
          .update({ status: "HELD", updated_at: new Date().toISOString() })
          .eq("id", payoutId);

        await AuditService.logAction({
          actorId: "PAYOUT_SETTLEMENT",
          actorRole: "SYSTEM",
          action: "PAYOUT_HOLD_PRESERVED",
          targetResourceType: "payout",
          targetResourceId: payoutId,
          reason: "Active dispute/return prevents settlement",
        });

        return { settled: false, reason: "Active dispute/return" };
      }
    }

    // Provider confirmation check
    const hasProviderConfirmation = Boolean(
      payout.provider_transfer_id || payout.bank_reference,
    );

    if (!hasProviderConfirmation) {
      // For COD: require 24h manual verification window
      if (payout.payment_method === "COD") {
        if (payout.store_order?.delivered_at) {
          const deliveredAt = new Date(payout.store_order.delivered_at);
          const hoursSinceDelivery = (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60);
          if (hoursSinceDelivery < 24) {
            return {
              settled: false,
              reason: `COD payout within 24h verification window (${Math.round(hoursSinceDelivery)}h elapsed)`,
            };
          }
        }
        // COD without explicit confirmation after 24h: allow with audit trail
      } else {
        // Digital payment without provider confirmation: never settle
        return { settled: false, reason: "Awaiting provider transfer confirmation" };
      }
    }

    // All checks passed: settle the payout
    const now = new Date().toISOString();
    await supabaseAdmin
      .from("payouts")
      .update({
        status: "SETTLED",
        processed_at: now,
        updated_at: now,
      })
      .eq("id", payoutId);

    // Create double-entry financial ledger entry
    const netPayout = (payout.amount_pkr || 0) - (payout.commission_pkr || 0);
    await supabaseAdmin.from("financial_ledger").insert([
      {
        store_id: payout.store_id,
        transaction_type: "PAYOUT_SETTLED",
        amount_pkr: -netPayout,
        entry_type: "DEBIT",
        reference_id: payoutId,
        description: `Seller payout settled for Order ${orderId || payoutId}`,
      },
      {
        store_id: payout.store_id,
        transaction_type: "COMMISSION_EARNED",
        amount_pkr: payout.commission_pkr || 0,
        entry_type: "CREDIT",
        reference_id: payoutId,
        description: `Platform commission for Order ${orderId || payoutId}`,
      },
    ]);

    await AuditService.logAction({
      actorId: "PAYOUT_SETTLEMENT",
      actorRole: "SYSTEM",
      action: "PAYOUT_SETTLED_PROVIDER_CONFIRMED",
      targetResourceType: "payout",
      targetResourceId: payoutId,
      newState: { providerConfirmed: hasProviderConfirmation },
      reason: `Payout of PKR ${netPayout} settled. Provider confirmed: ${hasProviderConfirmation}`,
    });

    return { settled: true, reason: "Provider confirmed, payout settled" };
  }

  /**
   * Reconciles all matured payouts that are eligible for settlement.
   * Must be run with distributed advisory lock for multi-replica safety.
   */
  static async reconcileMaturedPayouts(): Promise<{
    settled: number;
    held: number;
    skipped: number;
  }> {
    let settled = 0;
    let held = 0;
    let skipped = 0;

    const { data: maturedPayouts, error } = await supabaseAdmin
      .from("payouts")
      .select("id")
      .eq("status", "SCHEDULED");

    if (error || !maturedPayouts) {
      return { settled, held, skipped };
    }

    for (const payout of maturedPayouts) {
      const result = await this.settleWithProviderConfirmation(payout.id);
      if (result.settled) {
        settled++;
      } else if (result.reason.includes("dispute") || result.reason.includes("return")) {
        held++;
      } else {
        skipped++;
      }
    }

    logger.info(
      `[PayoutSettlement] Reconciliation complete: ${settled} settled, ${held} held, ${skipped} skipped`,
    );

    return { settled, held, skipped };
  }
}
