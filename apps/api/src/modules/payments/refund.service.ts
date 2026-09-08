import crypto from "crypto";
import { ENV } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { supabaseAdmin } from "../../config/supabase.js";
import { PostExXPayService } from "./xpay.service.js";
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
 * refund. Online methods settle through XPay/Raast; COD refunds cannot be
 * pushed through a payment gateway and require an out-of-band bank transfer.
 */
export function resolveRefundProvider(paymentMethod: unknown): "XPAY" | "COD_OFFLINE" {
  const method = String(paymentMethod || "").toUpperCase();
  const onlineMethods = [
    "XPAY",
    "XPAY_CARD",
    "CARD",
    "RAAST",
    "JAZZCASH",
    "EASYPAISA",
  ];
  return onlineMethods.includes(method) ? "XPAY" : "COD_OFFLINE";
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
    if (provider === "COD_OFFLINE") {
      // COD refunds are settled out-of-band (bank transfer / wallet) — flag
      // for human execution and confirmation, never fake a gateway success.
      await this.transition(refundId, "MANUAL_REVIEW", {
        failure_reason: "COD refund requires out-of-band settlement",
      });
      return { status: "MANUAL_REVIEW", refundId };
    }

    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("gateway_reference")
      .eq("order_id", input.orderId)
      .not("gateway_reference", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const gatewayReference = payment?.gateway_reference;
    if (!gatewayReference) {
      await this.transition(refundId, "MANUAL_REVIEW", {
        failure_reason: "No provider gateway_reference recorded for this order",
      });
      return { status: "MANUAL_REVIEW", refundId };
    }

    let lastError = "";
    for (let attempt = 1; attempt <= MAX_GATEWAY_ATTEMPTS; attempt++) {
      try {
        const result = await PostExXPayService.submitProviderRefund({
          gatewayReference,
          orderNumber: order.order_number,
          amountPkr: Number(input.amountPkr),
          idempotencyKey,
        });

        await supabaseAdmin
          .from("refund_executions")
          .update({
            status: "COMPLETED",
            provider_refund_id: result.refundId,
            provider_response: result.response,
            updated_at: new Date().toISOString(),
          })
          .eq("id", refundId);

        await this.applyRefundToOrder({
          orderId: input.orderId,
          orderTotalPkr: Number(order.total_amount_pkr || 0),
          amountPkr: Number(input.amountPkr),
          refundId,
          orderNumber: order.order_number,
        });

        await AuditService.logAction({
          actorId: input.executedBy || "SYSTEM",
          actorRole: "ADMIN",
          action: "GATEWAY_REFUND_EXECUTED",
          targetResourceType: "refund_execution",
          targetResourceId: refundId,
          newState: { status: "COMPLETED", providerRefundId: result.refundId },
          reason: input.reason || `Gateway refund for order ${order.order_number}`,
        });

        return {
          status: "COMPLETED",
          refundId,
          providerRefundId: result.refundId,
        };
      } catch (err: any) {
        lastError = err?.message || "unknown_gateway_error";
        logger.warn(`Gateway refund attempt ${attempt}/${MAX_GATEWAY_ATTEMPTS} failed`, {
          refundId,
          orderId: input.orderId,
          error: lastError,
        });
      }
    }

    await this.transition(refundId, "MANUAL_REVIEW", {
      failure_reason: `Gateway refund failed after ${MAX_GATEWAY_ATTEMPTS} attempts: ${lastError}`,
    });

    await AuditService.logAction({
      actorId: input.executedBy || "SYSTEM",
      actorRole: "ADMIN",
      action: "GATEWAY_REFUND_MANUAL_REVIEW",
      targetResourceType: "refund_execution",
      targetResourceId: refundId,
      reason: `Gateway refund failed after ${MAX_GATEWAY_ATTEMPTS} attempts — manual review required`,
    });

    return { status: "MANUAL_REVIEW", refundId, reason: lastError };
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
  private static async applyRefundToOrder(input: {
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
}

export const REFUND_GATEWAY_TIMEOUT_MS = 15000;
export const REFUND_MAX_ATTEMPTS = MAX_GATEWAY_ATTEMPTS;
export const IS_REFUND_GATEWAY_CONFIGURED = () =>
  Boolean(ENV.POSTEX_XPAY_TOKEN && ENV.POSTEX_XPAY_MERCHANT_ID);
