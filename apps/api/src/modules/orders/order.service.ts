import { supabaseAdmin } from "../../config/supabase.js";
import { redis } from "../../config/redis.js";
import { logger } from "../../config/logger.js";
import { WhatsAppService } from "../notifications/whatsapp.service.js";
import { CourierService } from "../logistics/courier.service.js";
import { QuoteService } from "./quote.service.js";
import { InventoryService } from "../products/inventory.service.js";
import { JobQueueManager } from "../../jobs/queue.service.js";
import { AuthorizationService } from "../auth/authorization.service.js";
import { CheckoutSessionService } from "../checkout/checkout-session.service.js";
import {
  calculateOrderSummary,
  OrderItemPricingInput,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ReturnReason,
  SellerType,
  UserRole,
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
    // 1. Durable idempotency check via database session
    if (input.quoteToken || input.idempotencyKey) {
      const { session, isDuplicate } = await CheckoutSessionService.beginSession({
        quoteToken: input.quoteToken || `gen_${Date.now()}`,
        buyerId: authenticatedUser?.id,
        buyerPhone: input.buyerPhone,
        idempotencyKey: input.idempotencyKey,
      });

      // If this is a duplicate committed session, return the existing order
      if (isDuplicate && session.order_id) {
        logger.info("Returning existing order from committed checkout session", {
          sessionId: session.id,
          orderId: session.order_id,
        });
        return {
          orderId: session.order_id,
          orderNumber: session.id.slice(0, 8),
          status: "already_processed",
          idempotentReplay: true,
        };
      }

      // If pending session exists but no order yet, this is a concurrent retry
      if (!isDuplicate && session.status === "pending" && session.order_id) {
        return {
          orderId: session.order_id,
          orderNumber: session.id.slice(0, 8),
          status: "already_processed",
          idempotentReplay: true,
        };
      }
    }

    // 2. Redis fast-path for non-session idempotency keys
    if (input.idempotencyKey && !input.quoteToken) {
      try {
        const cached = await redis.get(`idempotency:${input.idempotencyKey}`);
        if (cached) return JSON.parse(cached);
      } catch (err) {
        logger.warn("Failed to check idempotency cache", { key: input.idempotencyKey, error: (err as Error).message });
      }
    }

    // 3. Generate or verify quote
    let quote: any;
    let sessionId: string | null = null;

    if (input.quoteToken) {
      // Verify the quote token is valid (signature check)
      quote = QuoteService.verifyQuoteToken(input.quoteToken);

      // Create durable session if not already created
      const { session } = await CheckoutSessionService.beginSession({
        quoteToken: input.quoteToken,
        buyerId: authenticatedUser?.id,
        buyerPhone: input.buyerPhone,
        idempotencyKey: input.idempotencyKey,
      });
      sessionId = session.id;
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

    // 4. Execute checkout transaction via RPC
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
      // Mark session as failed so it can be retried
      if (sessionId) {
        await CheckoutSessionService.failSession(sessionId);
      }
      throw new Error(`Checkout transaction failed: ${error?.message || 'Unknown error'}`);
    }

    // 5. Commit the session atomically after successful order creation
    if (sessionId) {
      await CheckoutSessionService.commitSession(sessionId, result.order_id);
    }

    const response = {
      orderId: result.order_id,
      orderNumber: result.order_number,
      totalAmountPkr: result.total_amount_pkr,
      status: input.paymentMethod === PaymentMethod.COD ? "PENDING_COD" : "PENDING_PAYMENT"
    };

    // 6. Redis fast-path cache (secondary, not source of truth)
    if (input.idempotencyKey) {
      try {
        await redis.set(`idempotency:${input.idempotencyKey}`, JSON.stringify(response), { ex: 86400 });
      } catch (err) {
        logger.warn("Failed to set idempotency cache", { key: input.idempotencyKey, error: (err as Error).message });
      }
    }

    // WhatsApp Order Confirmation via BullMQ queue (async, retried)
    JobQueueManager.addJob("WHATSAPP_NOTIFICATION", {
      phone: input.buyerPhone,
      orderNumber: result.order_number,
      totalPkr: result.total_amount_pkr || quote.totalPkr,
      isCod: input.paymentMethod === PaymentMethod.COD,
    }).catch((err) => logger.error("Failed to enqueue WhatsApp notification:", err));

    return response;
  }

  /**
   * Fetches full order details including all store_orders and their shipments.
   * When userId/userRole are provided, enforces object-level authorization.
   */
  static async getOrder(id: string, userId?: string, userRole?: UserRole) {
    if (userId && userRole) {
      const authorized = await AuthorizationService.requireOrderOwnership(id, userId, userRole);
      if (!authorized) return null;
    }

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
  static async getUserOrders(buyerId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const { data: orders, error, count } = await supabaseAdmin
      .from("orders")
      .select("*, order_items(*), store_orders(*, order_items(*), shipments(*)), payments(*)", { count: "exact" })
      .eq("buyer_id", buyerId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { orders: orders || [], total: count || 0, page, limit };
  }

  /**
   * Submits a return request for an order using an atomic database RPC.
   * The RPC handles: validation, return request creation, return items insert,
   * and order status update in a single transaction.
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
      items: { orderItemId: string; quantity: number }[];
    },
  ) {
    // 0. Validate items array is non-empty
    if (!input.items || input.items.length === 0) {
      throw new Error("At least one item must be specified for return.");
    }

    // 1. Call atomic return request RPC
    const rpcItems = input.items.map((i) => ({
      order_item_id: i.orderItemId,
      quantity: i.quantity,
    }));

    const { data: result, error } = await supabaseAdmin.rpc('create_return_request', {
      p_order_id: orderId,
      p_buyer_id: buyerId,
      p_reason: input.reason,
      p_comments: input.comments || null,
      p_evidence_images: input.evidenceImages || [],
      p_refund_preference: input.refundPreference || 'ORIGINAL_PAYMENT',
      p_pickup_address: input.pickupAddress || null,
      p_pickup_city: input.pickupCity || null,
      p_items: rpcItems,
    });

    if (error || !result?.success) {
      throw new Error(`Return request failed: ${error?.message || result?.error || 'Unknown error'}`);
    }

    const returnRequestId = result.return_request_id;
    const totalRefundPkr = result.total_refund_pkr;

    // 2. Fetch the created return request for response
    const { data: returnReq } = await supabaseAdmin
      .from("return_requests")
      .select("*")
      .eq("id", returnRequestId)
      .single();

    // 3. Enqueue courier booking via BullMQ (async, retried, idempotent)
    let courierJobId: string | null = null;
    try {
      // Fetch order details for courier booking
      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("buyer_name, buyer_phone, shipping_address, shipping_city, order_number")
        .eq("id", orderId)
        .single();

      if (order) {
        courierJobId = await JobQueueManager.addJob(
          "REVERSE_COURIER_BOOKING",
          {
            returnRequestId,
            orderId,
            orderNumber: order.order_number || orderId,
            customerName: order.buyer_name,
            customerPhone: order.buyer_phone,
            pickupAddress: input.pickupAddress || order.shipping_address,
            pickupCity: input.pickupCity || order.shipping_city,
            returnReason: input.reason,
            itemsDescription: input.comments || "Customer Return",
          },
          {
            attempts: 3,
            backoff: { type: "exponential", delay: 5000 },
            jobId: `return_booking_${returnRequestId}`,
          },
        );
      }
    } catch (err) {
      logger.error("Failed to enqueue reverse courier booking", {
        returnRequestId,
        error: (err as Error).message,
      });
    }

    // 4. Immutable Audit Log
    const { AuditService } = await import("../audit/audit.service.js");
    await AuditService.logAction({
      actorId: buyerId,
      actorRole: "BUYER",
      action: "RETURN_REQUESTED",
      targetResourceType: "order",
      targetResourceId: orderId,
      newState: {
        returnRequestId,
        totalRefundPkr,
        courierJobEnqueued: !!courierJobId,
      },
      reason: `Buyer returned ${input.items.length} item(s): ${input.reason}`,
    });

    return {
      success: true,
      returnRequest: returnReq,
      totalRefundPkr,
      courierJobEnqueued: !!courierJobId,
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

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
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

    const { error } = await supabaseAdmin.rpc("cancel_order", {
      p_order_id: id,
      p_reason: reason || "Customer cancelled",
    });
    if (error) throw error;

    await InventoryService.releaseOrderReservation(
      id,
      reason || "Customer cancelled",
      authenticatedUser?.id || "CUSTOMER",
    );

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

    // Increment usage counter with optimistic concurrency guard.
    // .lte() ensures the update only applies if current_uses hasn't exceeded max_uses
    // since we last read it — not perfectly atomic but eliminates the TOCTOU gap.
    const { error: couponUpdateErr } = await supabaseAdmin
      .from("coupons")
      .update({ current_uses: coupon.current_uses + 1 })
      .eq("id", coupon.id)
      .lte("current_uses", coupon.max_uses ? coupon.max_uses - 1 : 999999);

    if (couponUpdateErr) {
      throw new Error("Coupon usage limit reached or concurrent modification detected");
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
