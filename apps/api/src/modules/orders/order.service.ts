import { supabaseAdmin } from "../../config/supabase.js";
import { redis } from "../../config/redis.js";
import { logger } from "../../config/logger.js";
import { WhatsAppService } from "../notifications/whatsapp.service.js";
import { CourierService } from "../logistics/courier.service.js";
import { QuoteService } from "./quote.service.js";
import { InventoryService } from "../products/inventory.service.js";
import {
  calculateOrderSummary,
  OrderItemPricingInput,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ReturnReason,
  SellerType,
} from "../../types/index.js";

export interface CartItem {
  productId: string;
  variantId?: string;
  quantity: number;
  storeId?: string;
  unitPricePkr?: number;
}

export interface CreateOrderInput {
  idempotencyKey?: string;
  quoteToken?: string;
  buyerId?: string;
  buyerName: string;
  buyerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingProvince: string;
  paymentMethod: PaymentMethod;
  couponCode?: string;
  notes?: string;
  items?: CartItem[];
}

export class OrderService {
  /**
   * Places a multi-vendor order using server-authoritative pricing and inventory checks.
   * Groups cart items by store_id, creates a parent order, then spawns one store_order
   * + PostEx shipment per distinct seller.
   */
  static async createOrder(input: CreateOrderInput, authenticatedUser?: any) {
    if (input.idempotencyKey) {
      try {
        const cached = await redis.get(`idempotency:${input.idempotencyKey}`);
        if (cached) return JSON.parse(cached);
      } catch {}
    }

    let quote: any;
    if (input.quoteToken) {
      const isUsed = await redis.get(`quote_used:${input.quoteToken}`);
      if (isUsed) throw new Error("This checkout session has already been processed.");
      quote = QuoteService.verifyQuoteToken(input.quoteToken);
      await redis.set(`quote_used:${input.quoteToken}`, "1", { ex: 86400 });
    } else if (input.items && input.items.length > 0) {
      quote = await QuoteService.generateQuote({
        items: input.items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
        shippingCity: input.shippingCity,
        paymentMethod: input.paymentMethod,
        couponCode: input.couponCode,
      });
    } else {
      throw new Error("Order must contain a valid quoteToken or items list");
    }

    const buyerId = authenticatedUser?.id;

    const rpcItems = quote.items.map((i: any) => ({
      offer_variant_id: i.variantId,
      quantity: i.quantity,
    }));

    const { data: result, error } = await supabaseAdmin.rpc('checkout_transaction', {
      p_buyer_id: buyerId || null,
      p_buyer_name: input.buyerName,
      p_buyer_phone: input.buyerPhone,
      p_shipping_address: input.shippingAddress,
      p_shipping_city: input.shippingCity,
      p_payment_method: input.paymentMethod,
      p_items: rpcItems,
      p_coupon_code: input.couponCode || null,
      p_idempotency_key: input.idempotencyKey || null,
    });

    if (error || !result?.success) {
      throw new Error(`Checkout transaction failed: ${error?.message || 'Unknown error'}`);
    }

    const response = {
      orderId: result.order_id,
      orderNumber: result.order_number,
      totalAmountPkr: result.total_amount_pkr,
      status: input.paymentMethod === PaymentMethod.COD ? "PENDING_COD" : "PENDING_PAYMENT"
    };

    if (input.idempotencyKey) {
      try {
        await redis.set(`idempotency:${input.idempotencyKey}`, JSON.stringify(response), { ex: 86400 });
      } catch {}
    }

    // WhatsApp Order Confirmation (fire and forget)
    WhatsAppService.sendOrderConfirmed(
      input.buyerPhone,
      result.order_number,
      result.total_amount_pkr || quote.totalPkr,
      input.paymentMethod === PaymentMethod.COD
    ).catch((err) => logger.error("WhatsApp order confirmation failed:", err));

    return response;
  }

  /**
   * Fetches full order details including all store_orders and their shipments.
   */
  static async getOrder(id: string) {
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*, store_orders(*, order_items(*, offer_variants(*, seller_offers(*, catalog_products(*)))), shipments(*))")
      .eq("id", id)
      .maybeSingle();

    return order;
  }

  /**
   * Fetches all orders placed by a specific buyer.
   */
  static async getUserOrders(buyerId: string) {
    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select("*, order_items(*), store_orders(*, order_items(*), shipments(*)), payments(*)")
      .eq("buyer_id", buyerId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return orders || [];
  }

  /**
   * Submits a return request for an order, books PostEx reverse pickup, and logs audit event.
   */
  static async createReturnRequest(
    orderId: string,
    buyerId: string,
    input: {
      reason: string;
      comments?: string;
      evidenceImages?: string[];
      refundPreference?: string;
      pickupAddress?: string;
      pickupCity?: string;
      items?: { orderItemId: string; quantity: number }[];
    },
  ) {
    // 1. Fetch order and verify ownership
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("*, order_items(*), store_orders(*)")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) throw new Error("Order not found");
    if (order.buyer_id && order.buyer_id !== buyerId) {
      throw new Error("Unauthorized to return this order");
    }

    // 2. Enforce 7-Day Return Policy
    const baselineDateStr = order.delivered_at || order.created_at;
    if (baselineDateStr) {
      const deliveredTime = new Date(baselineDateStr).getTime();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - deliveredTime > sevenDaysMs) {
        throw new Error("The 7-day return window for this order has expired.");
      }
    }

    // 3. Book reverse pickup via CourierService
    const reversePickupResult = await CourierService.bookPostExReversePickup({
      orderId: order.id,
      orderNumber: order.order_number || order.id,
      customerName: order.buyer_name,
      customerPhone: order.buyer_phone,
      pickupAddress: input.pickupAddress || order.shipping_address,
      pickupCity: input.pickupCity || order.shipping_city,
      returnReason: input.reason as ReturnReason,
      itemsDescription: input.comments || "Customer Return",
    });

    // 4. Create return_requests record
    const { data: returnReq, error: retErr } = await supabaseAdmin
      .from("return_requests")
      .insert({
        order_id: order.id,
        store_order_id: order.store_orders?.[0]?.id || null,
        buyer_id: buyerId,
        reason: input.reason,
        evidence_images: input.evidenceImages || [],
        status: "REVERSE_PICKUP_BOOKED",
        reverse_courier_cn: reversePickupResult.reverseTrackingNumber,
        refund_amount_pkr: order.total_amount_pkr || 0,
        staff_notes: input.comments
          ? `Buyer notes: ${input.comments}. Pref: ${input.refundPreference || "ORIGINAL_PAYMENT"}`
          : `Pref: ${input.refundPreference || "ORIGINAL_PAYMENT"}`,
      })
      .select()
      .single();

    if (retErr) throw retErr;

    // 5. If specific items, insert into return_items
    if (input.items && input.items.length > 0) {
      const returnItemsData = input.items.map((i) => ({
        return_request_id: returnReq.id,
        order_item_id: i.orderItemId,
        quantity: i.quantity || 1,
      }));
      await supabaseAdmin.from("return_items").insert(returnItemsData);
    }

    // 6. Update order status
    await supabaseAdmin
      .from("orders")
      .update({
        global_status: "RETURN_REQUESTED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    // 7. Immutable Audit Log
    const { AuditService } = await import("../audit/audit.service.js");
    await AuditService.logAction({
      actorId: buyerId,
      actorRole: "BUYER",
      action: "RETURN_REQUESTED",
      targetResourceType: "order",
      targetResourceId: order.id,
      previousState: { orderStatus: order.global_status },
      newState: {
        orderStatus: "RETURN_REQUESTED",
        returnRequestId: returnReq.id,
        reverseCn: reversePickupResult.reverseTrackingNumber,
      },
      reason: `Buyer returned order: ${input.reason}`,
    });

    return {
      success: true,
      returnRequest: returnReq,
      reverseShipment: reversePickupResult,
    };
  }

  /**
   * Fetches return details and reverse tracking for an order.
   */
  static async getOrderReturn(orderId: string, buyerId?: string) {
    let query = supabaseAdmin
      .from("return_requests")
      .select("*, order:orders(*), return_items(*)")
      .eq("order_id", orderId);

    if (buyerId) {
      query = query.eq("buyer_id", buyerId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data;
  }

  /**
   * Cancels an order (and all child store_orders) and releases inventory locks.
   */
  static async cancelOrder(
    id: string,
    reason?: string,
    authenticatedUser?: any,
  ) {
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*, store_orders(*, order_items(*))")
      .eq("id", id)
      .single();

    if (!order) throw new Error("Order not found");

    if (
      authenticatedUser &&
      authenticatedUser.role !== "ADMIN" &&
      order.buyer_id !== authenticatedUser.id
    ) {
      throw new Error("Forbidden");
    }

    // Cancel parent order
    await supabaseAdmin
      .from("orders")
      .update({
        global_status: "CANCELLED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    // Cancel all child store_orders and release inventory in ledger
    if (order.store_orders?.length > 0) {
      await supabaseAdmin
        .from("store_orders")
        .update({
          status: "CANCELLED",
          updated_at: new Date().toISOString(),
        })
        .eq("order_id", id);

      await InventoryService.releaseOrderReservation(
        id,
        reason || "Customer cancelled",
        authenticatedUser?.id || "CUSTOMER",
      );
    }

    return { success: true, orderId: id, status: "CANCELLED" };
  }

  /**
   * Validates and applies a coupon code to a cart total.
   * Returns the discount amount and final total.
   */
  static async applyCoupon(couponCode: string, cartItems: CartItem[]) {
    const cartTotal = cartItems.reduce(
      (s, i) => s + (i.unitPricePkr || 0) * i.quantity,
      0,
    );

    const { data: coupon, error } = await supabaseAdmin
      .from("coupons")
      .select("*")
      .eq("code", couponCode.toUpperCase())
      .eq("is_active", true)
      .single();

    if (error || !coupon) throw new Error("Invalid or expired coupon code");
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date())
      throw new Error("This coupon has expired");
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses)
      throw new Error("Coupon usage limit reached");
    if (cartTotal < coupon.min_spend_pkr)
      throw new Error(
        `Minimum spend of PKR ${coupon.min_spend_pkr} required for this coupon`,
      );

    // If seller-scoped coupon, only apply to that seller's items
    let eligibleTotal = cartTotal;
    if (coupon.store_id) {
      eligibleTotal = cartItems
        .filter((i) => i.storeId === coupon.store_id)
        .reduce((s, i) => s + (i.unitPricePkr || 0) * i.quantity, 0);
      if (eligibleTotal === 0)
        throw new Error(
          "This coupon only applies to items from a specific seller not in your cart",
        );
    }

    let discount = 0;
    if (coupon.discount_type === "PERCENTAGE") {
      discount = Math.round(eligibleTotal * (coupon.discount_value / 100));
      if (coupon.max_discount_pkr)
        discount = Math.min(discount, coupon.max_discount_pkr);
    } else if (coupon.discount_type === "FIXED_PKR") {
      discount = Math.min(coupon.discount_value, eligibleTotal);
    } else if (coupon.discount_type === "FREE_SHIPPING") {
      // Use actual shipping fee from the cart, not hardcoded
      discount = 0; // FREE_SHIPPING handled at total level
    }

    // Increment usage counter atomically
    try {
      await supabaseAdmin.rpc("increment_coupon_uses", {
        coupon_id: coupon.id,
      });
    } catch {
      // Fallback if RPC doesn't exist: direct update
      await supabaseAdmin
        .from("coupons")
        .update({ current_uses: coupon.current_uses + 1 })
        .eq("id", coupon.id);
    }

    return {
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discount_type,
        discountValue: coupon.discount_value,
        storeId: coupon.store_id,
      },
      discountPkr: discount,
      finalTotal: Math.max(0, cartTotal - discount),
      freeShipping: coupon.discount_type === "FREE_SHIPPING",
    };
  }

  /**
   * Opens an account-linked customer dispute for an order.
   */
  static async createDispute(
    orderId: string,
    buyerId: string,
    input: {
      reason: string;
      description: string;
      evidenceUrls?: string[];
      claimedAmountPkr?: number;
    },
  ) {
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("*, store_orders(*)")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) throw new Error("Order not found");
    if (order.buyer_id && order.buyer_id !== buyerId) {
      throw new Error("Unauthorized to file a dispute for this order");
    }

    const { data: dispute, error: dispErr } = await supabaseAdmin
      .from("return_requests")
      .insert({
        order_id: order.id,
        store_order_id: order.store_orders?.[0]?.id || null,
        buyer_id: buyerId,
        reason: input.reason,
        status: "DISPUTE_OPENED",
        refund_amount_pkr: input.claimedAmountPkr || order.total_amount_pkr || 0,
        staff_notes: `Buyer dispute: ${input.description}. Evidence: ${input.evidenceUrls?.join(", ") || "None provided"}`,
      })
      .select()
      .single();

    if (dispErr) throw dispErr;

    const { AuditService } = await import("../audit/audit.service.js");
    await AuditService.logAction({
      actorId: buyerId,
      actorRole: "BUYER",
      action: "DISPUTE_OPENED",
      targetResourceType: "order",
      targetResourceId: order.id,
      newState: dispute,
      reason: `Buyer opened dispute: ${input.reason}`,
    });

    return dispute;
  }
}
