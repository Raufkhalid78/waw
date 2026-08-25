import { supabaseAdmin } from '../../config/supabase.js';
import { calculateOrderSummary, OrderItemPricingInput, OrderStatus, PaymentMethod, PaymentStatus, SellerType } from '../../types/index.js';
import { WhatsAppService } from '../notifications/whatsapp.service.js';
import { CourierService } from '../logistics/courier.service.js';
import { InventoryLockService } from '../products/inventory-lock.service.js';

export interface CartItem {
  productId: string;
  variantId?: string;
  storeId: string;  // Required for multi-vendor split-order
  storeName?: string;
  storeCity?: string;
  quantity: number;
  unitPricePkr: number;
  sellerType?: SellerType;
  commissionRatePercentage?: number;
}

export interface CreateOrderInput {
  buyerId?: string;
  buyerName: string;
  buyerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingProvince: string;
  paymentMethod: PaymentMethod;
  couponCode?: string;
  notes?: string;
  items: CartItem[];
}

export class OrderService {
  /**
   * Places a multi-vendor order. Groups cart items by store_id, creates a parent
   * order, then spawns one store_order + PostEx shipment per distinct seller.
   */
  static async createOrder(input: CreateOrderInput) {
    if (!input.items || input.items.length === 0) {
      throw new Error('Order must contain at least 1 item');
    }

    const orderNumber = `WAW-${Math.floor(100000 + Math.random() * 900000)}`;
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const isCod = input.paymentMethod === PaymentMethod.COD;

    // 1. Acquire Redis Inventory Reservation Locks (15-min TTL)
    const lockAcquired = await InventoryLockService.acquireStockLocks(orderId, input.items);
    if (!lockAcquired) {
      throw new Error('Unable to reserve stock. One or more items are currently out of stock.');
    }

    // 2. Apply coupon if provided
    let couponDiscount = 0;
    let appliedCoupon: any = null;
    if (input.couponCode) {
      const { data: coupon } = await supabaseAdmin
        .from('coupons')
        .select('*')
        .eq('code', input.couponCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (coupon) {
        const cartTotal = input.items.reduce((s, i) => s + i.unitPricePkr * i.quantity, 0);
        if (cartTotal >= coupon.min_spend_pkr) {
          if (coupon.discount_type === 'PERCENTAGE') {
            couponDiscount = Math.round(cartTotal * (coupon.discount_value / 100));
            if (coupon.max_discount_pkr) couponDiscount = Math.min(couponDiscount, coupon.max_discount_pkr);
          } else if (coupon.discount_type === 'FIXED_PKR') {
            couponDiscount = coupon.discount_value;
          }
          appliedCoupon = coupon;
        }
      }
    }

    // 3. Calculate overall order pricing
    const pricingItems: OrderItemPricingInput[] = input.items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      sellerId: item.storeId,
      sellerType: item.sellerType || SellerType.THIRD_PARTY,
      commissionRatePercentage: item.commissionRatePercentage || 10,
      unitPricePkr: item.unitPricePkr,
      quantity: item.quantity,
    }));

    const summary = calculateOrderSummary(pricingItems, input.paymentMethod);
    const finalTotal = Math.max(0, summary.totalPkr - couponDiscount);

    // 4. Insert Parent Order Record
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        id: orderId,
        order_number: orderNumber,
        buyer_id: input.buyerId || null,
        buyer_name: input.buyerName,
        buyer_phone: input.buyerPhone,
        shipping_address: input.shippingAddress,
        shipping_city: input.shippingCity,
        shipping_province: input.shippingProvince,
        subtotal_pkr: summary.subtotalPkr,
        shipping_fee_pkr: summary.shippingPkr,
        cod_fee_pkr: summary.codFeePkr,
        total_pkr: finalTotal,
        payment_method: input.paymentMethod,
        payment_status: isCod ? PaymentStatus.COD_PENDING : PaymentStatus.PENDING,
        order_status: OrderStatus.CONFIRMED,
        notes: input.notes,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderError) {
      await InventoryLockService.releaseStockLocks(orderId, input.items);
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    // 5. Group items by store_id for split-order creation
    const itemsByStore = input.items.reduce<Record<string, CartItem[]>>((acc, item) => {
      if (!acc[item.storeId]) acc[item.storeId] = [];
      acc[item.storeId].push(item);
      return acc;
    }, {});

    const storeOrders: any[] = [];
    const shipments: any[] = [];

    // 6. For each seller — create a store_order + order_items + PostEx shipment
    for (const [storeId, storeItems] of Object.entries(itemsByStore)) {
      const storeSubtotal = storeItems.reduce((s, i) => s + i.unitPricePkr * i.quantity, 0);
      const storeShippingFee = 200; // PostEx flat rate
      const commissionRate = storeItems[0].commissionRatePercentage || 10;
      const commissionPkr = Math.round(storeSubtotal * (commissionRate / 100));
      const sellerPayoutPkr = storeSubtotal - commissionPkr;

      const storeOrderId = `sord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const { data: storeOrder } = await supabaseAdmin
        .from('store_orders')
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

      // 7. Insert order_items linked to this store_order
      const storeItemInserts = storeItems.map((item) => ({
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        order_id: orderId,
        store_order_id: storeOrderId,
        product_id: item.productId,
        variant_id: item.variantId || null,
        quantity: item.quantity,
        unit_price_pkr: item.unitPricePkr,
        total_price_pkr: item.unitPricePkr * item.quantity,
        created_at: new Date().toISOString(),
      }));

      await supabaseAdmin.from('order_items').insert(storeItemInserts);

      // 8. Book a distinct PostEx shipment per seller (COD or Prepaid)
      const shipment = await CourierService.bookCourierShipment({
        orderId: storeOrderId,         // each sub-order gets its own tracking
        orderNumber: `${orderNumber}-${storeId.slice(-4).toUpperCase()}`,
        customerName: input.buyerName,
        customerPhone: input.buyerPhone,
        deliveryAddress: input.shippingAddress,
        destinationCity: input.shippingCity,
        codAmountPkr: isCod ? storeSubtotal : 0,
        isCod,
        itemsCount: storeItems.reduce((s, i) => s + i.quantity, 0),
      });
      shipments.push(shipment);

      // 9. Create payout record for seller
      await supabaseAdmin.from('payouts').insert({
        id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        store_id: storeId,
        order_id: orderId,
        store_order_id: storeOrderId,
        amount_pkr: sellerPayoutPkr,
        commission_pkr: commissionPkr,
        status: 'SCHEDULED',
        scheduled_for: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // T+7 days escrow
        created_at: new Date().toISOString(),
      });
    }

    // 10. Decrement coupon usage if applied
    if (appliedCoupon) {
      await supabaseAdmin
        .from('coupons')
        .update({ current_uses: appliedCoupon.current_uses + 1 })
        .eq('id', appliedCoupon.id);
    }

    // 11. For COD orders, commit inventory deductions immediately
    if (isCod) {
      await InventoryLockService.commitStockDecrement(orderId, input.items);
    }

    // 12. WhatsApp Order Confirmation
    await WhatsAppService.sendOrderConfirmed(
      input.buyerPhone,
      orderNumber,
      finalTotal,
      isCod
    );

    return {
      orderId,
      orderNumber,
      summary: { ...summary, totalPkr: finalTotal, couponDiscount },
      storeOrders,
      shipments,
      status: OrderStatus.CONFIRMED,
    };
  }

  /**
   * Fetches full order details including all store_orders and their shipments.
   */
  static async getOrder(id: string) {
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('*, store_orders(*, order_items(*), shipments(*)), payments(*)')
      .eq('id', id)
      .maybeSingle();

    return order;
  }

  /**
   * Cancels an order (and all child store_orders) and releases inventory locks.
   */
  static async cancelOrder(id: string, reason?: string) {
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*), store_orders(*)')
      .eq('id', id)
      .single();

    if (!order) throw new Error('Order not found');

    // Cancel parent order
    await supabaseAdmin
      .from('orders')
      .update({
        order_status: OrderStatus.CANCELLED,
        notes: reason ? `Cancelled: ${reason}` : 'Cancelled by customer',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    // Cancel all child store_orders
    if (order.store_orders?.length > 0) {
      await supabaseAdmin
        .from('store_orders')
        .update({ order_status: OrderStatus.CANCELLED, updated_at: new Date().toISOString() })
        .eq('order_id', id);
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
    const cartTotal = cartItems.reduce((s, i) => s + i.unitPricePkr * i.quantity, 0);

    const { data: coupon, error } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('code', couponCode.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !coupon) throw new Error('Invalid or expired coupon code');
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) throw new Error('This coupon has expired');
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) throw new Error('Coupon usage limit reached');
    if (cartTotal < coupon.min_spend_pkr) throw new Error(`Minimum spend of PKR ${coupon.min_spend_pkr} required for this coupon`);

    // If seller-scoped coupon, only apply to that seller's items
    let eligibleTotal = cartTotal;
    if (coupon.store_id) {
      eligibleTotal = cartItems
        .filter((i) => i.storeId === coupon.store_id)
        .reduce((s, i) => s + i.unitPricePkr * i.quantity, 0);
      if (eligibleTotal === 0) throw new Error('This coupon only applies to items from a specific seller not in your cart');
    }

    let discount = 0;
    if (coupon.discount_type === 'PERCENTAGE') {
      discount = Math.round(eligibleTotal * (coupon.discount_value / 100));
      if (coupon.max_discount_pkr) discount = Math.min(discount, coupon.max_discount_pkr);
    } else if (coupon.discount_type === 'FIXED_PKR') {
      discount = Math.min(coupon.discount_value, eligibleTotal);
    } else if (coupon.discount_type === 'FREE_SHIPPING') {
      discount = 200; // Standard shipping fee waived
    }

    return {
      coupon: { code: coupon.code, discountType: coupon.discount_type, discountValue: coupon.discount_value },
      discountPkr: discount,
      finalTotal: Math.max(0, cartTotal - discount),
    };
  }
}

