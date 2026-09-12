import crypto from "crypto";
import { logger } from "../../config/logger.js";
import { supabaseAdmin } from "../../config/supabase.js";
import { AuditService } from "../audit/audit.service.js";

export interface RefundValidationResult {
  ok: boolean;
  reason?: string;
}

export interface RefundExecutionResult {
  status: "PENDING" | "SUBMITTED" | "COMPLETED" | "FAILED" | "MANUAL_REVIEW";
  refundId?: string;
  providerRefundId?: string | null;
  reason?: string;
  alreadyProcessed?: boolean;
}

const ACTIVE_REFUND_STATUSES = ["PENDING", "SUBMITTED", "COMPLETED"];
const MAX_GATEWAY_ATTEMPTS = 3;

/**
 * Pure refund-authorization gate: a gateway refund may only execute when the
 * order is actually paid and the requested amount does not exceed what is
 * still refundable (total minus all active/prior refunds). Exported for
 * deterministic testing without a database.
 */
export function validateRefundRequest(input: {
  amountPkr: unknown;
  orderTotalPkr: number;
  orderPaymentStatus: string;
  alreadyRefundedPkr: number;
}): RefundValidationResult {
  if (input.orderPaymentStatus === "REFUNDED") {
    return { ok: false, reason: "order_already_fully_refunded" };
  }

  if (input.orderPaymentStatus !== "PAID") {
    return {
      ok: false,
      reason: `order_not_paid: payment_status is ${input.orderPaymentStatus}`,
    };
  }

  const amount = Number(input.amountPkr);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, reason: "amount_missing_or_not_positive" };
  }

  const refundable =
    Number(input.orderTotalPkr || 0) - Number(input.alreadyRefundedPkr || 0);
  if (amount - refundable > 0.005) {
    return {
      ok: false,
      reason: `over_refund: refundable ${refundable}, requested ${amount}`,
    };
  }

  return { ok: true };
}

/**
 * Maps an internal payment method to the provider that must execute the
 * refund. Bank Alfalah APG exposes no public refund REST API, so online
 * refunds are executed out-of-band (bank transfer initiated by finance)
 * and tracked to MANUAL_REVIEW — never faked as automatic gateway success.
 */
export function resolveRefundProvider(paymentMethod: unknown): "GATEWAY" | "OFFLINE" {
  const method = String(paymentMethod || "").toUpperCase();
  const onlineMethods = [
    "ALFA_WALLET",
    "ALFALAH_ACCOUNT",
    "ALFA_CARD",
    "RAAST",
    "JAZZCASH",
    "EASYPAISA",
  ];
  return onlineMethods.includes(method) ? "GATEWAY" : "OFFLINE";
}

/**
 * Deterministic idempotency key: one refund per (order, return request,
 * amount). A duplicate call with the same key can never double-refund.
 */
export function buildRefundIdempotencyKey(input: {
  orderId: string;
  returnRequestId?: string | null;
  amountPkr: number;
}): string {
  return `refund:${input.orderId}:${input.returnRequestId ?? input.orderId}:${Number(
    input.amountPkr,
  ).toFixed(2)}`;
}

export class RefundService {
  /**
   * Executes a gateway refund for an order. Never throws for provider /
   * configuration problems — those are recorded on the refund_executions
   * row as FAILED or MANUAL_REVIEW so the caller (admin approval flow)
   * cannot be blocked by a gateway outage, and ops has an audit trail.
   */
  static async executeRefund(input: {
    orderId: string;
    amountPkr: number;
    returnRequestId?: string | null;
    executedBy?: string;
    reason?: string;
  }): Promise<RefundExecutionResult> {
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, total_amount_pkr, payment_status, payment_method")
      .eq("id", input.orderId)
      .single();

    if (orderErr || !order) {
      return { status: "FAILED", reason: "order_not_found" };
    }

    const { data: activeRefunds } = await supabaseAdmin
      .from("refund_executions")
      .select("amount_pkr, status")
      .eq("order_id", input.orderId)
      .in("status", ACTIVE_REFUND_STATUSES);

    const alreadyRefundedPkr = (activeRefunds || []).reduce(
      (sum, r) => sum + Number(r.amount_pkr || 0),
      0,
    );

    const validation = validateRefundRequest({
      amountPkr: input.amountPkr,
      orderTotalPkr: Number(order.total_amount_pkr || 0),
      orderPaymentStatus: String(order.payment_status || ""),
      alreadyRefundedPkr,
    });

    if (!validation.ok) {
      logger.warn("Refund request rejected by authorization gate", {
        orderId: input.orderId,
        reason: validation.reason,
      });
      return { status: "FAILED", reason: validation.reason };
    }

    const idempotencyKey = buildRefundIdempotencyKey({
      orderId: input.orderId,
      returnRequestId: input.returnRequestId,
      amountPkr: input.amountPkr,
    });

    // Atomic idempotency guard: the UNIQUE(idempotency_key) constraint makes
    // a concurrent duplicate insert fail with 23505 — the winner proceeds,
    // the loser returns the existing row as a no-op.
    const refundId = `ref_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const { error: insertErr } = await supabaseAdmin
      .from("refund_executions")
      .insert({
        id: refundId,
        order_id: input.orderId,
        return_request_id: input.returnRequestId || null,
        provider: resolveRefundProvider(order.payment_method),
        amount_pkr: Number(input.amountPkr),
        currency: "PKR",
        status: "PENDING",
        idempotency_key: idempotencyKey,
        executed_by: input.executedBy || "SYSTEM",
      });

    if (insertErr) {
      if (insertErr.code === "23505") {
        const { data: existing } = await supabaseAdmin
          .from("refund_executions")
          .select("id, status, provider_refund_id")
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle();
        logger.info("Duplicate refund suppressed by idempotency key", {
          orderId: input.orderId,
          idempotencyKey,
        });
        return {
          status: (existing?.status as RefundExecutionResult["status"]) || "PENDING",
          refundId: existing?.id,
          providerRefundId: existing?.provider_refund_id ?? null,
          alreadyProcessed: true,
        };
      }
      throw insertErr;
    }

    const provider = resolveRefundProvider(order.payment_method);
    if (provider === "OFFLINE") {
      // COD refunds are settled out-of-band (bank transfer / wallet) — flag
      // for human execution and confirmation, never fake a gateway success.
      await this.transition(refundId, "MANUAL_REVIEW", {
        failure_reason: "COD refund requires out-of-band settlement",
      });
      return { status: "MANUAL_REVIEW", refundId };
    }

    // Online refunds (APG/Raast): Bank Alfalah APG has no public refund
    // REST API, so these are executed out-of-band by finance against the
    // bank settlement. The execution row is created PENDING with the
    // idempotency lock and routed to MANUAL_REVIEW for a human to record
    // the bank transfer reference — no fake gateway success ever exists.
    await this.transition(refundId, "MANUAL_REVIEW", {
      failure_reason:
        "Online-method refund: execute via Bank Alfalah settlement portal and record the transfer reference",
    });

    await AuditService.logAction({
      actorId: input.executedBy || "SYSTEM",
      actorRole: "ADMIN",
      action: "GATEWAY_REFUND_MANUAL_REVIEW",
      targetResourceType: "refund_execution",
      targetResourceId: refundId,
      reason: `Refund for order ${order.order_number} queued for out-of-band bank settlement`,
    });

    return { status: "MANUAL_REVIEW", refundId };
  }

  private static async transition(
    refundId: string,
    status: RefundExecutionResult["status"],
    extra: Record<string, unknown> = {},
  ): Promise<void> {
    await supabaseAdmin
      .from("refund_executions")
      .update({ status, updated_at: new Date().toISOString(), ...extra })
      .eq("id", refundId);
  }

  /**
   * Post-completion bookkeeping: ledger entry + order payment status. The
   * order flips to REFUNDED only when refunds have consumed the full total;
   * partial refunds keep the order PAID with a partial refund record.
   */
  static async applyRefundToOrder(input: {
    orderId: string;
    orderTotalPkr: number;
    amountPkr: number;
    refundId: string;
    orderNumber: string;
  }): Promise<void> {
    await supabaseAdmin.from("financial_ledger").insert({
      transaction_type: "GATEWAY_REFUND",
      amount_pkr: -input.amountPkr,
      entry_type: "CREDIT",
      reference_id: input.refundId,
      description: `Gateway refund of PKR ${input.amountPkr} for Order ${input.orderNumber}`,
    });

    const { data: activeRefunds } = await supabaseAdmin
      .from("refund_executions")
      .select("amount_pkr")
      .eq("order_id", input.orderId)
      .eq("status", "COMPLETED");

    const totalRefunded = (activeRefunds || []).reduce(
      (sum, r) => sum + Number(r.amount_pkr || 0),
      0,
    );

    if (input.orderTotalPkr - totalRefunded <= 0.005) {
      await supabaseAdmin
        .from("orders")
        .update({
          payment_status: "REFUNDED",
          global_status: "REFUNDED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.orderId);
    }
  }

  /**
   * Finance completes an out-of-band (MANUAL_REVIEW) refund after executing
   * the bank transfer via the Bank Alfalah settlement portal. Records the
   * transfer reference, runs the ledger bookkeeping, and closes the row.
   */
  static async completeManualRefund(input: {
    refundId: string;
    bankReference: string;
    executedBy?: string;
  }): Promise<RefundExecutionResult> {
    const { data: refund, error } = await supabaseAdmin
      .from("refund_executions")
      .select("id, order_id, amount_pkr, status")
      .eq("id", input.refundId)
      .single();
    if (error || !refund) {
      return { status: "FAILED", reason: "refund_not_found" };
    }
    if (refund.status === "COMPLETED") {
      return { status: "COMPLETED", refundId: refund.id, alreadyProcessed: true };
    }
    if (refund.status !== "MANUAL_REVIEW") {
      return { status: "FAILED", reason: `refund_status_is_${refund.status}` };
    }
    if (!input.bankReference || input.bankReference.trim().length < 4) {
      return { status: "FAILED", reason: "bank_reference_required" };
    }

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, total_amount_pkr")
      .eq("id", refund.order_id)
      .single();
    if (!order) {
      return { status: "FAILED", reason: "order_not_found" };
    }

    await supabaseAdmin
      .from("refund_executions")
      .update({
        status: "COMPLETED",
        provider_refund_id: input.bankReference.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", refund.id);

    await this.applyRefundToOrder({
      orderId: order.id,
      orderTotalPkr: Number(order.total_amount_pkr || 0),
      amountPkr: Number(refund.amount_pkr || 0),
      refundId: refund.id,
      orderNumber: order.order_number,
    });

    await AuditService.logAction({
      actorId: input.executedBy || "FINANCE",
      actorRole: "ADMIN",
      action: "MANUAL_REFUND_COMPLETED",
      targetResourceType: "refund_execution",
      targetResourceId: refund.id,
      newState: { status: "COMPLETED", bankReference: input.bankReference.trim() },
      reason: "Out-of-band bank transfer executed and confirmed",
    });

    return { status: "COMPLETED", refundId: refund.id, providerRefundId: input.bankReference.trim() };
  }
}

export const REFUND_MAX_ATTEMPTS = MAX_GATEWAY_ATTEMPTS;
