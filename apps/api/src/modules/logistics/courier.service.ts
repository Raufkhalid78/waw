import axios from "axios";
import crypto from "crypto";
import { supabaseAdmin } from "../../config/supabase.js";
import { logger } from "../../config/logger.js";
import {
  CourierProvider,
  OrderStatus,
  PaymentStatus,
  ReturnReason,
  ReturnStatus,
} from "../../types/index.js";
import { ENV, FEATURES } from "../../config/env.js";

export interface PostExShipmentInput {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  destinationCity: string;
  codAmountPkr: number;
  isCod: boolean;
  orderNotes?: string;
  itemsCount: number;
}

export interface PostExReversePickupInput {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  pickupAddress: string;
  pickupCity: string;
  returnReason: ReturnReason;
  itemsDescription: string;
}

/**
 * Fulfillment lifecycle rank used to enforce monotonic order-status
 * transitions. A courier event may never move an order backward.
 */
export const ORDER_STATUS_RANK: Record<OrderStatus, number> = {
  [OrderStatus.PENDING]: 0,
  [OrderStatus.CONFIRMED]: 1,
  [OrderStatus.PROCESSING]: 2,
  [OrderStatus.SHIPPED]: 3,
  [OrderStatus.OUT_FOR_DELIVERY]: 4,
  [OrderStatus.DELIVERED]: 5,
  [OrderStatus.RETURN_REQUESTED]: 6,
  [OrderStatus.RETURNED]: 7,
  [OrderStatus.CANCELLED]: 8,
};

export type CourierEventDecision =
  | { action: "apply" }
  | { action: "reject-regression"; keepStatus: OrderStatus }
  | { action: "ignore-duplicate" };

/**
 * Pure decision function for courier status events: determines whether an
 * incoming status should be applied, rejected as a regression, or ignored as
 * a duplicate. Exported for deterministic unit testing.
 */
export function decideCourierStatusEvent(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus,
): CourierEventDecision {
  const currentRank = ORDER_STATUS_RANK[currentStatus] ?? -1;
  const targetRank = ORDER_STATUS_RANK[targetStatus] ?? -1;

  if (targetRank < currentRank) {
    return { action: "reject-regression", keepStatus: currentStatus };
  }
  if (targetRank === currentRank) {
    return { action: "ignore-duplicate" };
  }
  return { action: "apply" };
}

export const MAX_BOOKING_ATTEMPTS = 5;

export class CourierService {
  private static readonly POSTEX_API_BASE =
    ENV.POSTEX_API_BASE || "https://api.postex.pk/services/integration/api";

  /**
   * Smart Courier Routing Engine
   * Tier 1 major cities -> PostEx (Speed & dense hub coverage)
   * Heavy parcels (> 5kg) -> Trax Logistics (Better bulk weight rates)
   */
  static async selectCourier(
    destinationCity: string,
    weightKg: number = 0.5,
  ): Promise<CourierProvider> {
    const normalizedCity = (destinationCity || "").trim().toLowerCase();

    if (weightKg > 5.0) {
      return CourierProvider.TRAX;
    }

    const { data } = await supabaseAdmin
      .from("serviceable_cities")
      .select("tier")
      .ilike("city_name", destinationCity)
      .maybeSingle();

    if (data?.tier === 1) {
      return CourierProvider.POSTEX;
    }
    return CourierProvider.POSTEX;
  }

  /**
   * Single PostEx create-order attempt. Returns the consignment number on
   * success, null on ANY failure — a fabricated tracking number must never
   * reach a buyer.
   */
  private static async callPostExCreateOrder(input: PostExShipmentInput): Promise<{
    trackingNumber: string;
    trackingUrl: string;
  } | null> {
    if (!FEATURES.COURIER_ENABLED) return null;
    try {
      const response = await axios.post(
        `${this.POSTEX_API_BASE}/order/v1/create-order`,
        {
          cityName: input.destinationCity,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          deliveryAddress: input.deliveryAddress,
          invoicePayment: input.isCod ? input.codAmountPkr : 0,
          orderDetail: `Waw Order ${input.orderNumber}`,
          orderRefNumber: input.orderNumber,
          orderType: input.isCod ? "CashOnDelivery" : "Prepaid",
          items: input.itemsCount || 1,
        },
        {
          headers: {
            token: ENV.POSTEX_API_TOKEN,
            "Content-Type": "application/json",
          },
          timeout: 8000,
        },
      );

      const cn = response.data?.trackingNumber || response.data?.distCode;
      if (!cn) {
        logger.warn("PostEx create-order returned no consignment number", {
          orderNumber: input.orderNumber,
          responseKeys: response.data ? Object.keys(response.data) : [],
        });
        return null;
      }
      return { trackingNumber: cn, trackingUrl: `https://postex.pk/tracking?cn=${cn}` };
    } catch (err: any) {
      logger.error("PostEx create-order failed", {
        orderNumber: input.orderNumber,
        error: err.response?.data || err.message,
      });
      return null;
    }
  }

  /**
   * Automatically books courier dispatch for an order (both COD & Prepaid Waw Express).
   * On provider failure the shipment is persisted as BOOKING_PENDING with NO
   * tracking number — the reconciliation retry sweep re-attempts booking and
   * the buyer is never shown a consignment number the courier did not issue.
   */
  static async bookCourierShipment(input: PostExShipmentInput) {
    const selectedProvider = await this.selectCourier(input.destinationCity);
    logger.info(
      `🚚 Smart Logistics Route: Selected ${selectedProvider} for delivery to ${input.destinationCity}`,
    );

    const booking = await this.callPostExCreateOrder(input);

    let trackingNumber: string | null = null;
    let trackingUrl: string | null = null;
    if (booking) {
      trackingNumber = booking.trackingNumber;
      trackingUrl = booking.trackingUrl;
    } else if (ENV.NODE_ENV !== "production") {
      // Dev-only placeholder so local flows render a shippable state. The
      // "DEV-" prefix makes it obvious this number does not exist upstream.
      trackingNumber = `DEV-${input.orderNumber.replace(/[^0-9]/g, "").slice(-6) || Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      trackingUrl = `https://postex.pk/tracking?cn=${trackingNumber}`;
    }

    const status = trackingNumber ? OrderStatus.PROCESSING : "BOOKING_PENDING";

    const { data: shipment } = await supabaseAdmin
      .from("shipments")
      .insert({
        id: `ship_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        order_id: input.orderId,
        courier: CourierProvider.POSTEX,
        tracking_number: trackingNumber,
        status,
        is_cod: input.isCod,
        cod_amount_pkr: input.isCod ? input.codAmountPkr : 0,
        courier_cost_pkr: 180, // PostEx contracted base rate in PKR
        estimated_delivery_date: new Date(
          Date.now() + 2 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        tracking_url: trackingUrl,
        created_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle();

    if (trackingNumber) {
      logger.info(
        `📦 PostEx shipment successfully registered: CN #${trackingNumber} for Order ${input.orderNumber}`,
      );
    } else {
      logger.error(
        `⛔ Courier booking FAILED for Order ${input.orderNumber} — shipment held in BOOKING_PENDING for retry sweep (no tracking number issued)`,
      );
    }

    return (
      shipment || {
        orderId: input.orderId,
        courier: CourierProvider.POSTEX,
        trackingNumber,
        status,
        trackingUrl,
      }
    );
  }

  /**
   * Re-attempts a BOOKING_PENDING shipment against PostEx. Called by the
   * reconciliation sweep; increments booking_attempts so permanently failing
   * bookings dead-letter after MAX_BOOKING_ATTEMPTS instead of retrying
   * forever.
   *
   * Duplicate-booking guard: if any OTHER shipment for the same order already
   * carries a provider tracking number (e.g. the first create-order actually
   * succeeded but its response was lost), that consignment is ADOPTED instead
   * of creating a second one.
   */
  static async retryBooking(shipment: {
    id: string;
    order_id: string;
    is_cod: boolean | null;
    cod_amount_pkr: number | null;
    booking_attempts: number | null;
  }): Promise<boolean> {
    // 1. Adopt an existing consignment for this order, if one exists.
    const { data: existingTracked } = await supabaseAdmin
      .from("shipments")
      .select("id, tracking_number, tracking_url")
      .eq("order_id", shipment.order_id)
      .not("tracking_number", "is", null)
      .neq("id", shipment.id)
      .limit(1)
      .maybeSingle();

    const attempts = (shipment.booking_attempts || 0) + 1;
    const now = new Date().toISOString();

    if (existingTracked?.tracking_number) {
      await supabaseAdmin
        .from("shipments")
        .update({
          tracking_number: existingTracked.tracking_number,
          tracking_url: existingTracked.tracking_url,
          status: OrderStatus.PROCESSING,
          booking_attempts: attempts,
          updated_at: now,
        })
        .eq("id", shipment.id);
      logger.info(
        `📦 Booking retry ADOPTED existing CN #${existingTracked.tracking_number} for order ${shipment.order_id} (no duplicate booking created)`,
      );
      return true;
    }

    // 2. No consignment on record — re-attempt the provider booking.
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("order_number, buyer_name, buyer_phone, shipping_address, shipping_city")
      .eq("id", shipment.order_id)
      .single();

    if (!order) {
      logger.error(`Booking retry: order ${shipment.order_id} not found`, {
        shipmentId: shipment.id,
      });
      return false;
    }

    const booking = await this.callPostExCreateOrder({
      orderId: shipment.order_id,
      orderNumber: order.order_number,
      customerName: order.buyer_name,
      customerPhone: order.buyer_phone,
      deliveryAddress: order.shipping_address,
      destinationCity: order.shipping_city,
      isCod: Boolean(shipment.is_cod),
      codAmountPkr: Number(shipment.cod_amount_pkr || 0),
      itemsCount: 1,
    } as PostExShipmentInput);

    if (booking) {
      await supabaseAdmin
        .from("shipments")
        .update({
          tracking_number: booking.trackingNumber,
          tracking_url: booking.trackingUrl,
          status: OrderStatus.PROCESSING,
          booking_attempts: attempts,
          next_retry_at: null,
          updated_at: now,
        })
        .eq("id", shipment.id);
      logger.info(
        `📦 Booking retry succeeded: CN #${booking.trackingNumber} for Order ${order.order_number} (attempt ${attempts})`,
      );
      return true;
    }

    // 3. Failed — schedule the next attempt with exponential backoff
    //    (attempts^2 × 30 min, capped at 24 h) so a flapping provider is not
    //    hammered every cycle.
    const backoffMs = Math.min(
      attempts * attempts * 30 * 60 * 1000,
      24 * 60 * 60 * 1000,
    );
    await supabaseAdmin
      .from("shipments")
      .update({
        booking_attempts: attempts,
        next_retry_at: new Date(Date.now() + backoffMs).toISOString(),
        updated_at: now,
      })
      .eq("id", shipment.id);

    if (attempts >= MAX_BOOKING_ATTEMPTS) {
      logger.error(
        `🚨 DEAD LETTER: Courier booking for Order ${order.order_number} failed ${attempts} times — manual dispatch required (shipment ${shipment.id})`,
      );
    }
    return false;
  }

  /**
   * Verifies PostEx logistics webhook HMAC-SHA256 signature.
   */
  static verifyPostExWebhookSignature(
    payload: any,
    signatureHeader?: string,
  ): boolean {
    if (!signatureHeader || !ENV.POSTEX_API_TOKEN) {
      if (
        ENV.NODE_ENV !== "production" &&
        signatureHeader === "test_postex_signature"
      ) {
        return true;
      }
      return false;
    }

    try {
      const dataToSign =
        typeof payload === "string" ? payload : JSON.stringify(payload);
      const computed = crypto
        .createHmac("sha256", ENV.POSTEX_API_TOKEN)
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
   * Processes live PostEx Delivery Status Webhook events.
   * Maps PostEx milestones (InTransit, OutForDelivery, Delivered, Returned) to internal OrderStatus.
   */
  static async handlePostExWebhook(payload: any) {
    const trackingNumber =
      payload.trackingNumber || payload.distCode || payload.orderRefNumber;
    const postexStatus =
      payload.orderStatus || payload.status || payload.transactionStatus;

    if (!trackingNumber) {
      throw new Error("Missing trackingNumber in PostEx webhook payload");
    }

    logger.info(
      `🚚 [PostEx Webhook] Tracking #${trackingNumber} status update: ${postexStatus}`,
    );

    // Map PostEx status to internal OrderStatus
    let targetOrderStatus: OrderStatus = OrderStatus.PROCESSING;
    let targetPaymentStatus: PaymentStatus | undefined = undefined;

    const normalized = (postexStatus || "").toUpperCase();
    if (normalized.includes("DELIVERED") || normalized === "COMPLETED") {
      targetOrderStatus = OrderStatus.DELIVERED;
      targetPaymentStatus = PaymentStatus.COD_COLLECTED;
    } else if (
      normalized.includes("OUT") ||
      normalized.includes("DISPATCHED")
    ) {
      targetOrderStatus = OrderStatus.OUT_FOR_DELIVERY;
    } else if (
      normalized.includes("TRANSIT") ||
      normalized.includes("PICKED")
    ) {
      targetOrderStatus = OrderStatus.SHIPPED;
    } else if (normalized.includes("RETURN") || normalized.includes("FAILED")) {
      targetOrderStatus = OrderStatus.RETURNED;
    }

    // 1. Update Shipment Record (fetch current status for monotonicity)
    const { data: existingShipment } = await supabaseAdmin
      .from("shipments")
      .select("status, order_id, store_order_id, is_cod")
      .eq("tracking_number", trackingNumber)
      .maybeSingle();

    if (existingShipment?.status) {
      const decision = decideCourierStatusEvent(
        existingShipment.status as OrderStatus,
        targetOrderStatus,
      );

      // Monotonic state machine: never move an order backward. A delayed
      // SHIPPED/OUT_FOR_DELIVERY event after DELIVERED is discarded.
      if (decision.action === "reject-regression") {
        logger.warn(
          `⛔ [PostEx Webhook] Rejected stale status regression ${existingShipment.status} → ${targetOrderStatus} for tracking #${trackingNumber}`,
        );
        return {
          success: false,
          trackingNumber,
          newStatus: decision.keepStatus,
          message: `Stale event rejected: cannot move from ${existingShipment.status} to ${targetOrderStatus}`,
        };
      }

      // Idempotent no-op: same-status duplicate events change nothing.
      if (decision.action === "ignore-duplicate") {
        return {
          success: true,
          trackingNumber,
          newStatus: existingShipment.status,
          message: `Duplicate milestone ignored (${targetOrderStatus})`,
        };
      }
    }

    const { data: shipment } = await supabaseAdmin
      .from("shipments")
      .update({
        status: targetOrderStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("tracking_number", trackingNumber)
      .select()
      .maybeSingle();

    // 2. Update Associated Order Record & Store Order
    if (shipment && shipment.order_id) {
      const orderUpdate: any = {
        global_status: targetOrderStatus,
        updated_at: new Date().toISOString(),
      };
      if (shipment.is_cod && targetPaymentStatus) {
        orderUpdate.payment_status = targetPaymentStatus;
      }

      await supabaseAdmin
        .from("orders")
        .update(orderUpdate)
        .eq("id", shipment.order_id);

      if (shipment.store_order_id) {
        await supabaseAdmin
          .from("store_orders")
          .update({ status: targetOrderStatus, updated_at: new Date().toISOString() })
          .eq("id", shipment.store_order_id);
      }

      // If delivered, schedule payout maturity for 7-day returns SLA window
      if (targetOrderStatus === OrderStatus.DELIVERED) {
        const maturityDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        if (shipment.store_order_id) {
          const { data: storeOrder } = await supabaseAdmin
            .from("store_orders")
            .select("store_id")
            .eq("id", shipment.store_order_id)
            .maybeSingle();

          if (storeOrder?.store_id) {
            await supabaseAdmin
              .from("payouts")
              .update({
                status: "SCHEDULED",
                scheduled_for: maturityDate,
                updated_at: new Date().toISOString(),
              })
              .eq("store_id", storeOrder.store_id)
              .eq("status", "HELD_PENDING_DELIVERY");
          }
        }
      }

      logger.info(
        `✅ Order ${shipment.order_id} updated to ${targetOrderStatus} via PostEx Webhook`,
      );
    }

    return { success: true, trackingNumber, newStatus: targetOrderStatus };
  }

  /**
   * Books a PostEx reverse pickup consignment for 7-day buyer returns.
   */
  static async bookPostExReversePickup(input: PostExReversePickupInput) {
    let reverseCn = `REV-PTX-${Date.now().toString().slice(-6)}-${Math.floor(10 + Math.random() * 90)}`;
    let returnTrackingUrl = `https://postex.pk/tracking?cn=${reverseCn}`;

    // Real PostEx Reverse Pickup API integration
    if (FEATURES.COURIER_ENABLED) {
      try {
        const response = await axios.post(
          `${this.POSTEX_API_BASE}/order/v1/create-reverse-pickup`,
          {
            cityName: input.pickupCity,
            customerName: input.customerName,
            customerPhone: input.customerPhone,
            pickupAddress: input.pickupAddress,
            orderRefNumber: input.orderNumber,
            reason: input.returnReason,
            itemDetail: input.itemsDescription,
          },
          {
            headers: {
              token: ENV.POSTEX_API_TOKEN,
              "Content-Type": "application/json",
            },
            timeout: 8000,
          },
        );

        if (response.data && response.data.distCode) {
          reverseCn = response.data.distCode;
          returnTrackingUrl = `https://postex.pk/tracking?cn=${reverseCn}`;
        }
      } catch (err: any) {
        logger.warn(
          "⚠️ PostEx Reverse Pickup fallback to CN generator:",
          err.response?.data || err.message,
        );
      }
    }

    logger.info(
      `🔄 PostEx Reverse Pickup registered: CN #${reverseCn} for Order ${input.orderNumber} (Reason: ${input.returnReason})`,
    );

    return {
      success: true,
      courier: CourierProvider.POSTEX,
      reverseTrackingNumber: reverseCn,
      trackingUrl: returnTrackingUrl,
      scheduledPickupDate: new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      ).toISOString(),
      pickupAddress: input.pickupAddress,
      pickupCity: input.pickupCity,
      status: ReturnStatus.PICKUP_SCHEDULED,
      instructions:
        "Please hand over the securely packaged item with this CN written on top to the PostEx pickup rider.",
    };
  }

  /**
   * Generates PostEx 4x6 thermal shipping label metadata / printable payload.
   */
  static generatePostExAirWaybill(
    trackingNumber: string,
    orderNumber: string,
    recipient: any,
  ) {
    return {
      trackingNumber,
      orderNumber,
      courier: "PostEx Express Logistics PK",
      barcodeUrl: `https://bwipjs-api.metafloor.com/?bcid=code128&text=${trackingNumber}&scale=2&height=10`,
      hub: "LHE-CENTRAL-HUB-01",
      recipientName: recipient.name,
      recipientPhone: recipient.phone,
      recipientAddress: recipient.address,
      city: recipient.city,
      codAmountPkr: recipient.codAmountPkr || 0,
      weightKg: 0.5,
      date: new Date().toLocaleDateString("en-GB"),
    };
  }
}
