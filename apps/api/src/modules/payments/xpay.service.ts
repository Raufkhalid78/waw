import crypto from "crypto";
import axios from "axios";
import { ENV } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { supabaseAdmin } from "../../config/supabase.js";
import { ConfigService } from "../admin/config.service.js";
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "../../types/index.js";
import { WhatsAppService } from "../notifications/whatsapp.service.js";
import { CourierService } from "../logistics/courier.service.js";
import { InventoryLockService } from "../products/inventory-lock.service.js";
import { SubscriptionService } from "../subscriptions/subscription.service.js";

export interface XPayIntentResponse {
  intentId: string;
  checkoutUrl: string;
  orderNumber: string;
  amountPkr: number;
  qrPayload?: string;
}

export interface PaymentVerificationResult {
  ok: boolean;
  reason?: string;
}

/**
 * Pure payment-verification gate: a provider payment event may only settle an
 * order when the amount matches the authoritative order total (within a 0.5
 * paisa float tolerance) and the currency is PKR. Exported for deterministic
 * signed-fixture testing without a database.
 */
export function verifyProviderPaymentAgainstOrder(input: {
  providerAmount: unknown;
  providerCurrency: unknown;
  orderAmountPkr: number;
  orderPaymentStatus?: string;
  expectedCurrency?: string;
}): PaymentVerificationResult {
  const expectedCurrency = input.expectedCurrency || "PKR";

  // Already paid — idempotent no-op.
  if (input.orderPaymentStatus === "PAID") {
    return { ok: true, reason: "already_paid" };
  }

  // Amount must be a finite number matching the authoritative total.
  const providerAmount = Number(input.providerAmount);
  const orderAmount = Number(input.orderAmountPkr || 0);
  if (!Number.isFinite(providerAmount)) {
    return { ok: false, reason: "amount_missing_or_not_numeric" };
  }
  if (Math.abs(providerAmount - orderAmount) > 0.005) {
    return {
      ok: false,
      reason: `amount_mismatch: expected ${orderAmount}, received ${providerAmount}`,
    };
  }

  // Currency must match exactly.
  const providerCurrency = String(input.providerCurrency || expectedCurrency).toUpperCase();
  if (providerCurrency !== expectedCurrency.toUpperCase()) {
    return {
      ok: false,
      reason: `currency_mismatch: expected ${expectedCurrency}, received ${providerCurrency}`,
    };
  }

  return { ok: true };
}

export class PostExXPayService {
  private static baseUrl =
    ENV.POSTEX_XPAY_BASE_URL || "https://xpay.postexglobal.com/api";

  /**
   * The webhook endpoint PostEx XPay calls with signed payment events.
   * This is the Express route in THIS API server — verified and versioned in
   * the repository. Never point at external/edge endpoints that are not
   * deployed from this codebase.
   */
  private static get webhookUrl(): string {
    if (ENV.PUBLIC_API_URL) {
      return `${ENV.PUBLIC_API_URL.replace(/\/+$/, "")}/api/payments/xpay/webhook`;
    }
    throw new Error(
      "PUBLIC_API_URL is not configured. Set it to the public base URL of this API so XPay can deliver payment callbacks.",
    );
  }

  /**
   * Creates a real PostEx XPay checkout session via their REST API.
   * Returns a hosted checkout URL for Card, Raast, JazzCash, or Easypaisa.
   */
  static async createPaymentIntent(
    orderId: string,
    method: PaymentMethod = PaymentMethod.XPAY_CARD,
  ): Promise<XPayIntentResponse> {
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    if (order.payment_status === PaymentStatus.PAID) {
      throw new Error(`Order ${order.order_number} is already paid`);
    }

    const totalAmount = order.total_amount_pkr || 0;
    const merchantId = ENV.POSTEX_XPAY_MERCHANT_ID;

    if (!merchantId || merchantId === "WAW-POSTEX-001") {
      throw new Error(
        "XPay merchant ID not configured. Set POSTEX_XPAY_MERCHANT_ID in .env",
      );
    }

    // Map internal payment method to PostEx XPay method codes
    const methodMap: Record<string, string> = {
      XPAY_CARD: "CARD",
      CARD: "CARD",
      RAAST: "RAAST",
      JAZZCASH: "JAZZCASH",
      EASYPAISA: "EASYPAISA",
    };
    const xpayMethod = methodMap[method] || "CARD";

    // Call PostEx XPay API to create checkout session
    const response = await axios.post(
      `${this.baseUrl}/checkout/create`,
      {
        merchantId,
        orderNumber: order.order_number,
        amount: totalAmount,
        currency: "PKR",
        paymentMethod: xpayMethod,
        customerName: order.buyer_name,
        customerPhone: order.buyer_phone,
        customerEmail: order.notes || undefined,
        callbackUrl: this.webhookUrl,
        returnUrls: {
          // /payment/result is the buyer-facing payment outcome page that
          // maps order_number -> order and shows the current payment state.
          success: `${process.env.NEXT_PUBLIC_WEB_URL || "https://www.waw.com.pk"}/payment/result?order=${order.order_number}`,
          failure: `${process.env.NEXT_PUBLIC_WEB_URL || "https://www.waw.com.pk"}/payment/result?order=${order.order_number}&status=failed`,
          cancel: `${process.env.NEXT_PUBLIC_WEB_URL || "https://www.waw.com.pk"}/payment/result?order=${order.order_number}&status=cancelled`,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${ENV.POSTEX_XPAY_TOKEN}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      },
    );

    const { checkoutUrl, sessionId, qrPayload } = response.data;

    if (!checkoutUrl && !sessionId) {
      throw new Error(
        `PostEx XPay API returned invalid response: ${JSON.stringify(response.data)}`,
      );
    }

    const intentId = sessionId || `xpay_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const finalCheckoutUrl =
      checkoutUrl || `${this.baseUrl}/checkout/${intentId}`;

    // Record payment intent in database
    await supabaseAdmin.from("payments").insert({
      id: `pay_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
      order_id: order.id,
      payment_method: method,
      status: PaymentStatus.PENDING,
      gateway_reference: intentId,
      amount_pkr: totalAmount,
      gateway_response: response.data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return {
      intentId,
      checkoutUrl: finalCheckoutUrl,
      orderNumber: order.order_number,
      amountPkr: totalAmount,
      qrPayload,
    };
  }

  /**
   * Creates a direct payment intent for a fixed amount not tied to an order
   * (e.g. seller subscription charges). Returns the checkout session URL.
   */
  static async createPaymentIntentDirect(input: {
    orderId: string;
    amountPkr: number;
    customerPhone: string;
    description: string;
    method: string;
    returnUrl: string;
  }): Promise<{ checkoutUrl?: string; payment_url?: string; redirect_url?: string }> {
    const merchantId = ENV.POSTEX_XPAY_MERCHANT_ID;

    if (!merchantId || merchantId === "WAW-POSTEX-001") {
      throw new Error(
        "XPay merchant ID not configured. Set POSTEX_XPAY_MERCHANT_ID in .env",
      );
    }

    const methodMap: Record<string, string> = {
      XPAY_CARD: "CARD",
      CARD: "CARD",
      RAAST: "RAAST",
      JAZZCASH: "JAZZCASH",
      EASYPAISA: "EASYPAISA",
    };

    const response = await axios.post(
      `${this.baseUrl}/checkout/create`,
      {
        merchantId,
        orderNumber: input.orderId,
        amount: input.amountPkr,
        currency: "PKR",
        paymentMethod: methodMap[input.method] || "CARD",
        customerName: input.description,
        customerPhone: input.customerPhone || undefined,
        callbackUrl: this.webhookUrl,
        returnUrls: {
          success: input.returnUrl,
          failure: input.returnUrl,
          cancel: input.returnUrl,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${ENV.POSTEX_XPAY_TOKEN}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      },
    );

    const { checkoutUrl, sessionId } = response.data;

    if (!checkoutUrl && !sessionId) {
      throw new Error(
        `PostEx XPay API returned invalid response: ${JSON.stringify(response.data)}`,
      );
    }

    const intentId = sessionId || `xpay_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    return {
      checkoutUrl: checkoutUrl || `${this.baseUrl}/checkout/${intentId}`,
      payment_reference: intentId,
    } as any;
  }

  /**
   * Verifies PostEx XPay timing-safe HMAC-SHA256 signature for incoming webhooks.
   * Optionally accepts a secret override for testing.
   */
  static verifyWebhookSignature(
    payload: any,
    signatureHeader?: string,
    secretOverride?: string,
  ): boolean {
    const secret = secretOverride || ENV.POSTEX_XPAY_SECRET_KEY;
    if (!signatureHeader || !secret) {
      return false;
    }

    try {
      const dataToSign =
        typeof payload === "string" ? payload : JSON.stringify(payload);
      const computed = crypto
        .createHmac("sha256", secret)
        .update(dataToSign)
        .digest("hex");

      const sigBuffer = Buffer.from(signatureHeader, "hex");
      const compBuffer = Buffer.from(computed, "hex");

      if (sigBuffer.length !== compBuffer.length) return false;
      return crypto.timingSafeEqual(sigBuffer, compBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Processes verified PostEx XPay webhook event.
   * Auto-confirms order, books PostEx rider dispatch, and triggers buyer WhatsApp notification.
   */
  static async handleWebhook(event: {
    event: string;
    data: {
      orderId?: string;
      orderNumber?: string;
      transactionId?: string;
      amount?: number;
      currency?: string;
      status?: string;
    };
  }) {
    const { event: eventType, data } = event;

    if (eventType !== "payment.successful" && data.status !== "PAID") {
      return {
        success: false,
        message: `Ignored unhandled event: ${eventType}`,
      };
    }

    const orderRef = data.orderNumber || data.orderId;
    const txId = data.transactionId || orderRef;

    if (!orderRef)
      throw new Error("Missing order reference in PostEx XPay webhook payload");

    // Idempotency Check — single atomic insert; if transaction_id already exists, skip
    const { error: insertErr } = await supabaseAdmin
      .from("xpay_webhooks_log")
      .insert({ transaction_id: txId, event_type: eventType });

    if (insertErr) {
      // Unique constraint violation means this webhook was already processed
      if (insertErr.code === "23505") {
        return {
          success: true,
          message: `Webhook for tx ${txId} already processed (Idempotency Guard)`,
        };
      }
      throw insertErr;
    }

    // Subscription charges (sub_* references) are not orders — activate the
    // pending seller subscription and stop here.
    if (orderRef.startsWith("sub_")) {
      const activated = await SubscriptionService.activatePendingSubscription(orderRef);
      return {
        success: true,
        message: activated
          ? `Subscription activated for ${orderRef}`
          : `No pending subscription found for ${orderRef}`,
      };
    }

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*, items:order_items(*)")
      .or(`order_number.eq.${orderRef},id.eq.${orderRef}`)
      .single();

    if (!order) throw new Error(`Order ${orderRef} not found in database`);

    // ── SECURITY GATES: already-paid / amount / currency ─────────────────
    // Any mismatch is quarantined — the order is NEVER marked paid.
    const verification = verifyProviderPaymentAgainstOrder({
      providerAmount: data.amount,
      providerCurrency: data.currency,
      orderAmountPkr: order.total_amount_pkr,
      orderPaymentStatus: order.payment_status,
    });

    if (!verification.ok && verification.reason === "already_paid") {
      return {
        success: true,
        orderNumber: order.order_number,
        status: PaymentStatus.PAID,
        message: "Order already paid — no state change",
      };
    }

    if (!verification.ok) {
      logger.error("XPay webhook payment verification failed — order NOT marked paid", {
        orderNumber: order.order_number,
        orderAmountPkr: order.total_amount_pkr,
        providerAmountPkr: data.amount,
        providerCurrency: data.currency,
        transactionId: txId,
        reason: verification.reason,
      });
      throw new Error(
        `Payment verification failed for order ${order.order_number}: ${verification.reason}. Order quarantined — manual review required.`,
      );
    }

    // All gates passed — transition Order to Confirmed and Paid
    await supabaseAdmin
      .from("orders")
      .update({
        payment_status: PaymentStatus.PAID,
        global_status: OrderStatus.CONFIRMED,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    // 2. Finalize Inventory stock deductions
    if (order.items && order.items.length > 0) {
      await InventoryLockService.commitStockDecrement(
        order.id,
        order.items.map((it: any) => ({
          productId: it.offer_variant_id || it.product_id || it.id,
          variantId: it.offer_variant_id || it.variant_id,
          quantity: it.quantity,
        })),
      );
    }

    // 3. Automatically book PostEx courier pickup and generate Air Waybill
    try {
      await CourierService.bookCourierShipment({
        orderId: order.id,
        orderNumber: order.order_number,
        customerName: order.buyer_name,
        customerPhone: order.buyer_phone,
        deliveryAddress: order.shipping_address,
        destinationCity: order.shipping_city,
        codAmountPkr: 0,
        isCod: false,
        itemsCount: order.items?.length || 1,
      });
    } catch (courierErr) {
      logger.warn("PostEx automatic consignment booking notice:", courierErr);
    }

    // 4. Send instant WhatsApp confirmation to Pakistani buyer
    try {
      await WhatsAppService.sendOrderConfirmed(
        order.buyer_phone,
        order.order_number,
        order.total_amount_pkr || 0,
        false,
      );
    } catch (notifErr) {
      logger.warn("WhatsApp alert dispatch notice:", notifErr);
    }

    return {
      success: true,
      orderNumber: order.order_number,
      status: PaymentStatus.PAID,
    };
  }

  /**
   * Generates EMVCo compliant Raast Instant P2M QR payload with standard CRC16 checksum.
   */
  static async generateRaastQrPayload(params: {
    orderNumber: string;
    amountPkr: number;
    merchantTitle: string;
    merchantId: string;
  }): Promise<string> {
    const p = (id: string, value: string) => {
      const len = value.length.toString().padStart(2, "0");
      return `${id}${len}${value}`;
    };

    const defaultCity = await ConfigService.get("default_city") || "Islamabad";

    let raw = "";
    raw += p("00", "01"); // Format indicator
    raw += p("01", "12"); // Dynamic QR
    raw += p("26", p("00", "PK.RAAST.P2M") + p("01", params.merchantId));
    raw += p("52", "5399"); // Merchant Category Code (General Marketplace)
    raw += p("53", "586"); // PKR Currency
    raw += p("54", params.amountPkr.toFixed(2));
    raw += p("58", "PK"); // Country
    raw += p("59", params.merchantTitle.substring(0, 25));
    raw += p("60", defaultCity.substring(0, 15));
    raw += p("62", p("05", params.orderNumber));
    raw += "6304";

    const crc = this.computeCrc16(raw);
    return `${raw}${crc.toString(16).toUpperCase().padStart(4, "0")}`;
  }

  private static computeCrc16(data: string): number {
    let crc = 0xffff;
    for (let i = 0; i < data.length; i++) {
      crc ^= data.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) {
          crc = ((crc << 1) ^ 0x1021) & 0xffff;
        } else {
          crc = (crc << 1) & 0xffff;
        }
      }
    }
    return crc;
  }
}
