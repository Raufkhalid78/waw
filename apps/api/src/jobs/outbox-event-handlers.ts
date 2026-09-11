import { supabaseAdmin } from "../config/supabase.js";
import { logger } from "../config/logger.js";
import { CourierService } from "../modules/logistics/courier.service.js";
import { WhatsAppService } from "../modules/notifications/whatsapp.service.js";

export interface BookCourierPayload {
  orderId: string;
  orderNumber?: string;
  isCod?: boolean;
  codAmountPkr?: number;
}

export interface NotifyOrderConfirmedPayload {
  orderId: string;
  orderNumber?: string;
  buyerPhone?: string;
  buyerId?: string;
  totalPkr?: number;
  isCod?: boolean;
}

/**
 * Shared outbox event handlers used by BOTH the BullMQ worker
 * (jobs/queue.service.ts) and the outbox processor cron
 * (jobs/outbox-processor.cron.ts). Keeping them in one place prevents the
 * two dispatch paths from drifting apart.
 */

/**
 * Book a courier shipment for a fully-paid (or COD) order.
 * Idempotent: skips if a shipment already exists for the order.
 */
export async function handleBookCourier(payload: BookCourierPayload): Promise<void> {
  logger.info(
    `📦 [Outbox] Booking courier for order ${payload.orderNumber || payload.orderId}`,
  );

  // Load the order fresh — the payload is a pointer, not a snapshot.
  const { data: order, error: orderErr } = await supabaseAdmin
    .from("orders")
    .select(
      "id, order_number, buyer_name, buyer_phone, shipping_address, shipping_city, payment_method, total_amount_pkr, items:order_items(*)",
    )
    .eq("id", payload.orderId)
    .single();

  if (orderErr || !order) {
    throw new Error(`BOOK_COURIER: order ${payload.orderId} not found`);
  }

  // Idempotent: skip if a tracked or pending shipment already exists.
  const { data: existingShipment } = await supabaseAdmin
    .from("shipments")
    .select("id, status, tracking_number")
    .eq("order_id", order.id)
    .limit(1)
    .maybeSingle();

  if (existingShipment) {
    logger.info(
      `📦 [Outbox] Shipment already exists for order ${order.order_number} (${existingShipment.status}) — booking skipped`,
    );
    return;
  }

  // Source of truth for COD is the order row, not the payload.
  const isCod =
    payload.isCod ??
    (order.payment_method === "COD" || order.payment_method === "cod");

  await CourierService.bookCourierShipment({
    orderId: order.id,
    orderNumber: order.order_number,
    customerName: order.buyer_name,
    customerPhone: order.buyer_phone,
    deliveryAddress: order.shipping_address,
    destinationCity: order.shipping_city,
    codAmountPkr: isCod ? payload.codAmountPkr ?? order.total_amount_pkr ?? 0 : 0,
    isCod,
    itemsCount: order.items?.length || 1,
  });
}

/**
 * Send buyer confirmations (WhatsApp + push) for a confirmed order.
 * WhatsApp failures never block the push channel and vice versa.
 */
export async function handleNotifyOrderConfirmed(
  payload: NotifyOrderConfirmedPayload,
): Promise<void> {
  logger.info(
    `📨 [Outbox] Sending order confirmation for ${payload.orderNumber || payload.orderId}`,
  );

  // WhatsApp — never blocks the notification flow on one channel.
  if (payload.buyerPhone) {
    try {
      await WhatsAppService.sendOrderConfirmed(
        payload.buyerPhone,
        payload.orderNumber || payload.orderId,
        payload.totalPkr || 0,
        payload.isCod || false,
      );
    } catch (waErr: any) {
      logger.warn("WhatsApp confirmation dispatch notice:", waErr?.message);
    }
  }

  // Push (FCM) — idempotent per order: a replayed outbox event can
  // never send the same confirmation twice.
  const buyerId = payload.buyerId;
  if (buyerId) {
    try {
      const { PushService } = await import(
        "../modules/notifications/push.service.js"
      );
      const { data: pushResult } = await supabaseAdmin.rpc(
        "record_notification_event",
        {
          p_idempotency_key: `order_confirmed:${payload.orderId}`,
          p_user_id: payload.buyerId,
          p_channel: "push",
        },
      );
      if (pushResult === true) {
        await PushService.sendToUser(buyerId, {
          title: "Order Confirmed ✅",
          body: `Order ${payload.orderNumber} is confirmed — PKR ${(payload.totalPkr || 0).toLocaleString()}${payload.isCod ? " (COD)" : " paid"}.`,
          data: {
            orderId: payload.orderId,
            orderNumber: payload.orderNumber || "",
            type: "ORDER_CONFIRMED",
          },
        });
      } else {
        logger.info(
          `Push for order ${payload.orderNumber} already sent (idempotency guard)`,
        );
      }
    } catch (pushErr: any) {
      logger.warn("Push notification dispatch notice:", pushErr?.message);
    }
  }
}
