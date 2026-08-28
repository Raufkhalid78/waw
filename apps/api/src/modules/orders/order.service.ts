import { supabaseAdmin } from "../../config/supabase.js";
import {
  calculateOrderSummary,
  OrderItemPricingInput,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ReturnReason,
  SellerType,
} from "../../types/index.js";
import { WhatsAppService } from "../notifications/whatsapp.service.js";
import { CourierService } from "../logistics/courier.service.js";
import { InventoryLockService } from "../products/inventory-lock.service.js";
import { QuoteService } from "./quote.service.js";
import { redis } from "../../config/redis.js";

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
    // 0. Idempotency Key check: if already processed, return cached order result
    if (input.idempotencyKey) {
      try {
        const cached = await redis.get(`idempotency:${input.idempotencyKey}`);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch {
        // Continue if redis is unavailable
      }
    }

    let quote: any;

    if (input.quoteToken) {
      // Idempotency check: Ensure quoteToken is only used once
      const isUsed = await redis.get(`quote_used:${input.quoteToken}`);
      if (isUsed) {
        throw new Error(
          "This checkout session has already been processed. Please return to your cart.",
        );
      }

      quote = QuoteService.verifyQuoteToken(input.quoteToken);

      // Mark as used (expires in 24 hours to keep Redis clean)
      await redis.set(`quote_used:${input.quoteToken}`, "1", "EX", 86400);
    } else if (input.items && input.items.length > 0) {
      // Derive server-authoritative quote on the fly
      quote = await QuoteService.generateQuote({
        items: input.items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
        shippingCity: input.shippingCity,
        paymentMethod: input.paymentMethod,
        couponCode: input.couponCode,
      });
    } else {
      throw new Error("Order must contain a valid quoteToken or items list");
    }

    const orderNumber = `WAW-${Math.floor(100000 + Math.random() * 900000)}`;
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const isCod = input.paymentMethod === PaymentMethod.COD;
    const buyerId = authenticatedUser?.id;

    if (!buyerId) {
      throw new Error("Unauthorized: buyer ID required");
    }

    const lockItems = quote.items.map((i: any) => ({
      productId: i.productId,
      variantId: i.variantId,
      quantity: i.quantity,
    }));

    // 1. Acquire Redis Inventory Reservation Locks (15-min TTL)
    const lockAcquired = await InventoryLockService.acquireStockLocks(
      orderId,
      lockItems,
    );
    if (!lockAcquired) {
      throw new Error(
        "Unable to reserve stock. One or more items are currently out of stock.",
      );
    }

    const finalTotal = quote.totalPkr;
    const couponDiscount = quote.couponDiscountPkr || 0;

    // 2. Insert Parent Order Record into Supabase
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        id: orderId,
        order_number: orderNumber,
        buyer_id: buyerId,
        buyer_name: input.buyerName,
        buyer_phone: input.buyerPhone,
        shipping_address: input.shippingAddress,
        shipping_city: input.shippingCity,
        shipping_province: input.shippingProvince,
        subtotal_pkr: quote.subtotalPkr,
        shipping_fee_pkr: quote.shippingFeePkr,
        cod_fee_pkr: quote.codFeePkr,
        total_pkr: finalTotal,
        payment_method: input.paymentMethod,
        payment_status: isCod
          ? PaymentStatus.COD_PENDING
          : PaymentStatus.PENDING,
        order_status: OrderStatus.CONFIRMED,
        notes: input.notes,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderError) {
      await InventoryLockService.releaseStockLocks(orderId, lockItems);
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    // 3. Group items by store_id for split-order creation
    const itemsByStore: Record<string, any[]> = {};
    for (const item of quote.items) {
      if (!itemsByStore[item.storeId]) itemsByStore[item.storeId] = [];
      itemsByStore[item.storeId].push(item);
    }

    const storeOrders: any[] = [];
    const shipments: any[] = [];

    // 4. For each seller — create a store_order + order_items + PostEx shipment
    for (const [storeId, storeItems] of Object.entries(itemsByStore)) {
      const storeSubtotal = (storeItems as any[]).reduce(
        (s, i) => s + i.totalPricePkr,
        0,
      );
      const storeShippingFee = quote.shippingFeePkr === 0 ? 0 : 200;
      const commissionRate =
        (storeItems as any[])[0].commissionRatePercentage || 10;
      const commissionPkr = Math.round(storeSubtotal * (commissionRate / 100));
      const sellerPayoutPkr = storeSubtotal - commissionPkr;

      const storeOrderId = `sord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const { data: storeOrder } = await supabaseAdmin
        .from("store_orders")
        .insert({
          id: storeOrderId,
          order_id: orderId,
          store_id: storeId,
          subtotal_pkr: storeSubtotal,
          shipping_fee_pkr: storeShippingFee,
          commission_pkr: commissionPkr,
          seller_payout_pkr: sellerPayoutPkr,
          order_status: OrderStatus.CONFIRMED,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      storeOrders.push(storeOrder);

      // 5. Insert order_items linked to this store_order
      const storeItemInserts = (storeItems as any[]).map((item) => ({
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        order_id: orderId,
        store_order_id: storeOrderId,
        product_id: item.productId,
        variant_id: item.variantId || null,
        quantity: item.quantity,
        unit_price_pkr: item.unitPricePkr,
        total_price_pkr: item.totalPricePkr,
        created_at: new Date().toISOString(),
      }));

      await supabaseAdmin.from("order_items").insert(storeItemInserts);

      // 6. Book shipment and create payout only if COD. For prepaid, wait for XPay webhook.
      if (isCod) {
        const shipment = await CourierService.bookCourierShipment({
          orderId: storeOrderId,
          orderNumber: `${orderNumber}-${storeId.slice(-4).toUpperCase()}`,
          customerName: input.buyerName,
          customerPhone: input.buyerPhone,
          deliveryAddress: input.shippingAddress,
          destinationCity: input.shippingCity,
          codAmountPkr: storeSubtotal,
          isCod: true,
          itemsCount: (storeItems as any[]).reduce((s, i) => s + i.quantity, 0),
        });
        shipments.push(shipment);

        // 7. Create payout record for seller
        await supabaseAdmin.from("payouts").insert({
          id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          store_id: storeId,
          order_id: orderId,
          store_order_id: storeOrderId,
          amount_pkr: sellerPayoutPkr,
          commission_pkr: commissionPkr,
          status: "SCHEDULED",
          scheduled_for: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          created_at: new Date().toISOString(),
        });
      }
    }

    // 8. Decrement coupon usage if applied
    if (quote.appliedCoupon?.code) {
      const { data: c } = await supabaseAdmin
        .from("coupons")
        .select("id, current_uses")
        .eq("code", quote.appliedCoupon.code)
        .single();
      if (c) {
        await supabaseAdmin
          .from("coupons")
          .update({ current_uses: c.current_uses + 1 })
          .eq("id", c.id);
      }
    }

    // 9. For COD orders, commit inventory deductions immediately
    if (isCod) {
      await InventoryLockService.commitStockDecrement(orderId, lockItems);
    }

    // 10. WhatsApp Order Confirmation
    await WhatsAppService.sendOrderConfirmed(
      input.buyerPhone,
      orderNumber,
      finalTotal,
      isCod,
    );

    const result = {
      orderId,
      orderNumber,
      summary: {
        subtotalPkr: quote.subtotalPkr,
        shippingPkr: quote.shippingFeePkr,
        codFeePkr: quote.codFeePkr,
        couponDiscountPkr: couponDiscount,
        totalPkr: finalTotal,
      },
      storeOrders,
      shipments,
      status: OrderStatus.CONFIRMED,
    };

    if (input.idempotencyKey) {
      try {
        await redis.set(
          `idempotency:${input.idempotencyKey}`,
          JSON.stringify(result),
          "EX",
          86400,
        );
      } catch {
        // Continue if Redis is unavailable
      }
    }

    return result;
  }

  /**
   * Fetches full order details including all store_orders and their shipments.
   */
  static async getOrder(id: string) {
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*, order_items(*), store_orders(*, order_items(*), shipments(*)), payments(*)")
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

    // 2. Book reverse pickup via CourierService
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

    // 3. Create return_requests record
    const { data: returnReq, error: retErr } = await supabaseAdmin
      .from("return_requests")
      .insert({
        order_id: order.id,
        store_order_id: order.store_orders?.[0]?.id || null,
        buyer_id: buyerId,
        reason: input.reason,
        status: "REVERSE_PICKUP_BOOKED",
        reverse_courier_cn: reversePickupResult.reverseTrackingNumber,
        refund_amount_pkr: order.total_pkr,
        staff_notes: input.comments
          ? `Buyer notes: ${input.comments}. Pref: ${input.refundPreference || "ORIGINAL_PAYMENT"}`
          : `Pref: ${input.refundPreference || "ORIGINAL_PAYMENT"}`,
      })
      .select()
      .single();

    if (retErr) throw retErr;

    // 4. If specific items, insert into return_items
    if (input.items && input.items.length > 0) {
      const returnItemsData = input.items.map((i) => ({
        return_request_id: returnReq.id,
        order_item_id: i.orderItemId,
        quantity: i.quantity || 1,
      }));
      await supabaseAdmin.from("return_items").insert(returnItemsData);
    }

    // 5. Update order status
    await supabaseAdmin
      .from("orders")
      .update({
        order_status: OrderStatus.RETURN_REQUESTED,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    // 6. Immutable Audit Log
    const { AuditService } = await import("../audit/audit.service.js");
    await AuditService.logAction({
      actorId: buyerId,
      actorRole: "BUYER",
      action: "RETURN_REQUESTED",
      targetResourceType: "order",
      targetResourceId: order.id,
      previousState: { orderStatus: order.order_status },
      newState: {
        orderStatus: OrderStatus.RETURN_REQUESTED,
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
   * Cancels an order (and all child store_orders) and releases inventory locks.
   */
  static async cancelOrder(
    id: string,
    reason?: string,
    authenticatedUser?: any,
  ) {
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*, order_items(*), store_orders(*)")
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
        order_status: OrderStatus.CANCELLED,
        notes: reason ? `Cancelled: ${reason}` : "Cancelled by customer",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    // Cancel all child store_orders
    if (order.store_orders?.length > 0) {
      await supabaseAdmin
        .from("store_orders")
        .update({
          order_status: OrderStatus.CANCELLED,
          updated_at: new Date().toISOString(),
        })
        .eq("order_id", id);
    }

    // Release inventory reservation locks
    if (order.order_items?.length > 0) {
      const lockItems = order.order_items.map((i: any) => ({
        productId: i.product_id,
        variantId: i.variant_id,
        quantity: i.quantity,
      }));
      await InventoryLockService.releaseStockLocks(id, lockItems);
    }

    return { success: true, orderId: id, status: OrderStatus.CANCELLED };
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
      discount = 200; // Standard shipping fee waived
    }

    return {
      coupon: {
        code: coupon.code,
        discountType: coupon.discount_type,
        discountValue: coupon.discount_value,
      },
      discountPkr: discount,
      finalTotal: Math.max(0, cartTotal - discount),
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
        refund_amount_pkr: input.claimedAmountPkr || order.total_pkr,
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
