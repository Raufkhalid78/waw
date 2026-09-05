import { supabaseAdmin } from "../../config/supabase.js";
import { logger } from "../../config/logger.js";
import { AuditService } from "../audit/audit.service.js";
import { OutboxService } from "../outbox/outbox.service.js";

export type ChargebackStatus =
  | "RECEIVED"
  | "UNDER_REVIEW"
  | "EVIDENCE_SUBMITTED"
  | "WON"
  | "LOST"
  | "CLOSED";

export interface ChargebackInput {
  orderId: string;
  paymentId: string;
  providerReference: string;
  reason: string;
  amountPkr: number;
  evidenceDeadline?: Date;
}

/**
 * Chargeback and Payment Reversal Service
 * Handles payment provider chargebacks, bank reversals, and dispute resolution.
 * Maintains a double-entry financial ledger for all reversals.
 */
export class ChargebackService {
  /**
   * Records a new chargeback against an order. Freezes the seller payout
   * and creates financial ledger entries for the dispute.
   */
  static async recordChargeback(input: ChargebackInput): Promise<string> {
    const { data: existing } = await supabaseAdmin
      .from("return_requests")
      .select("id")
      .eq("order_id", input.orderId)
      .eq("reason", `CHARGEBACK: ${input.reason}`)
      .limit(1);

    if (existing && existing.length > 0) {
      logger.warn(`Chargeback already recorded for order ${input.orderId}`);
      return existing[0].id;
    }

    const { data: chargeback, error } = await supabaseAdmin
      .from("return_requests")
      .insert({
        order_id: input.orderId,
        buyer_id: null,
        reason: `CHARGEBACK: ${input.reason}`,
        status: "DISPUTE_OPENED",
        refund_amount_pkr: input.amountPkr,
        staff_notes: JSON.stringify({
          provider_reference: input.providerReference,
          payment_id: input.paymentId,
          evidence_deadline: input.evidenceDeadline?.toISOString(),
          type: "CHARGEBACK",
        }),
      })
      .select("id")
      .single();

    if (error) throw error;

    // Freeze any pending payout for this order
    await supabaseAdmin
      .from("payouts")
      .update({ status: "HELD", updated_at: new Date().toISOString() })
      .eq("order_id", input.orderId)
      .in("status", ["SCHEDULED", "PROCESSING"]);

    // Create financial ledger entry (debit = chargeback liability)
    await supabaseAdmin.from("financial_ledger").insert({
      transaction_type: "CHARGEBACK",
      amount_pkr: -input.amountPkr,
      entry_type: "DEBIT",
      reference_id: chargeback.id,
      description: `Chargeback received for Order ${input.orderId}: ${input.reason}`,
    });

    await AuditService.logAction({
      actorId: "SYSTEM",
      actorRole: "SYSTEM",
      action: "CHARGEBACK_RECEIVED",
      targetResourceType: "order",
      targetResourceId: input.orderId,
      newState: { chargebackId: chargeback.id, amountPkr: input.amountPkr },
      reason: `Chargeback of PKR ${input.amountPkr} received: ${input.reason}`,
    });

    await OutboxService.publish("CHARGEBACK_RECEIVED", {
      orderId: input.orderId,
      amount: input.amountPkr,
      reason: input.reason,
    });

    return chargeback.id;
  }

  /**
   * Submits evidence for a chargeback dispute.
   */
  static async submitEvidence(
    chargebackId: string,
    evidence: {
      trackingNumber?: string;
      deliveryConfirmation?: string;
      customerCommunication?: string;
      additionalNotes?: string;
    },
  ): Promise<void> {
    const { error } = await supabaseAdmin
      .from("return_requests")
      .update({
        status: "PENDING_REVIEW",
        staff_notes: JSON.stringify({
          ...evidence,
          evidence_submitted_at: new Date().toISOString(),
        }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", chargebackId);

    if (error) throw error;

    await AuditService.logAction({
      actorId: "SYSTEM",
      actorRole: "ADMIN",
      action: "CHARGEBACK_EVIDENCE_SUBMITTED",
      targetResourceType: "return_request",
      targetResourceId: chargebackId,
      reason: "Chargeback evidence submitted for review",
    });
  }

  /**
   * Resolves a chargeback as WON (in our favor) or LOST.
   */
  static async resolve(
    chargebackId: string,
    resolution: "WON" | "LOST",
    notes?: string,
  ): Promise<void> {
    const { data: chargeback } = await supabaseAdmin
      .from("return_requests")
      .select("order_id, refund_amount_pkr, staff_notes")
      .eq("id", chargebackId)
      .single();

    if (!chargeback) throw new Error("Chargeback not found");

    const staffNotes = typeof chargeback.staff_notes === "string"
      ? JSON.parse(chargeback.staff_notes)
      : chargeback.staff_notes || {};

    const finalStatus = resolution === "WON" ? "REJECTED" : "REFUND_APPROVED";

    await supabaseAdmin
      .from("return_requests")
      .update({
        status: finalStatus,
        staff_notes: JSON.stringify({
          ...staffNotes,
          resolution,
          resolved_at: new Date().toISOString(),
          resolution_notes: notes,
        }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", chargebackId);

    if (resolution === "WON") {
      // Unfreeze payout if chargeback was won
      await supabaseAdmin
        .from("payouts")
        .update({ status: "SCHEDULED", updated_at: new Date().toISOString() })
        .eq("order_id", chargeback.order_id)
        .eq("status", "HELD");

      await supabaseAdmin.from("financial_ledger").insert({
        transaction_type: "CHARGEBACK_REVERSAL",
        amount_pkr: chargeback.refund_amount_pkr,
        entry_type: "CREDIT",
        reference_id: chargebackId,
        description: `Chargeback won for Order ${chargeback.order_id}`,
      });
    } else {
      // Process refund for lost chargeback
      await supabaseAdmin.from("financial_ledger").insert({
        transaction_type: "CHARGEBACK_REFUND",
        amount_pkr: -chargeback.refund_amount_pkr,
        entry_type: "CREDIT",
        reference_id: chargebackId,
        description: `Chargeback lost, refund processed for Order ${chargeback.order_id}`,
      });
    }

    await AuditService.logAction({
      actorId: "SYSTEM",
      actorRole: "ADMIN",
      action: `CHARGEBACK_${resolution}`,
      targetResourceType: "return_request",
      targetResourceId: chargebackId,
      reason: `Chargeback resolved as ${resolution}: ${notes || "No notes"}`,
    });
  }

  /**
   * Processes a bank-initiated payment reversal (separate from chargeback).
   */
  static async processPaymentReversal(params: {
    orderId: string;
    paymentId: string;
    amountPkr: number;
    reason: string;
    bankReference: string;
  }): Promise<void> {
    // Update payment status
    await supabaseAdmin
      .from("payments")
      .update({
        status: "REFUNDED",
        updated_at: new Date().toISOString(),
        gateway_response: JSON.stringify({
          reversal: true,
          bank_reference: params.bankReference,
          reason: params.reason,
        }),
      })
      .eq("id", params.paymentId);

    // Create financial ledger entry
    await supabaseAdmin.from("financial_ledger").insert({
      transaction_type: "PAYMENT_REVERSAL",
      amount_pkr: -params.amountPkr,
      entry_type: "CREDIT",
      reference_id: params.paymentId,
      description: `Payment reversal for Order ${params.orderId}: ${params.reason}`,
    });

    // Update order payment status
    await supabaseAdmin
      .from("orders")
      .update({
        payment_status: "REFUNDED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.orderId);

    await AuditService.logAction({
      actorId: "SYSTEM",
      actorRole: "SYSTEM",
      action: "PAYMENT_REVERSAL_PROCESSED",
      targetResourceType: "order",
      targetResourceId: params.orderId,
      newState: { amountPkr: params.amountPkr, bankReference: params.bankReference },
      reason: `Payment reversal of PKR ${params.amountPkr}: ${params.reason}`,
    });
  }
}
