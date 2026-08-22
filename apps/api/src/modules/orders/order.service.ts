import { supabaseAdmin } from '../../config/supabase.js';
import { calculateOrderSummary, OrderItemPricingInput, OrderStatus, PaymentMethod, PaymentStatus, SellerType } from '../../types/index.js';
import { WhatsAppService } from '../notifications/whatsapp.service.js';
import { CourierService } from '../logistics/courier.service.js';
import { InventoryLockService } from '../products/inventory-lock.service.js';

export interface CreateOrderInput {
  buyerId?: string;
  buyerName: string;
  buyerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingProvince: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  items: {
    productId: string;
    variantId?: string;
    quantity: number;
    unitPricePkr?: number;
    sellerType?: SellerType;
  }[];
}

export class OrderService {
  /**
   * Places an order, acquires 15-minute flash-sale inventory reservation locks,
   * calculates exact pricing (Free Shipping > 5000 PKR, COD fee +100 PKR),
   * records order in Supabase, and triggers WhatsApp confirmation.
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

    // 2. Calculate Pricing
    const pricingItems: OrderItemPricingInput[] = input.items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      sellerId: null,
      sellerType: item.sellerType || SellerType.FIRST_PARTY,
      commissionRatePercentage: 10,
      unitPricePkr: item.unitPricePkr || 2499,
      quantity: item.quantity,
    }));

    const summary = calculateOrderSummary(pricingItems, input.paymentMethod);

    // 3. Insert Order Record into Supabase
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        id: orderId,
        order_number: orderNumber,
        buyer_id: input.buyerId || 'guest_buyer',
        buyer_name: input.buyerName,
        buyer_phone: input.buyerPhone,
        shipping_address: input.shippingAddress,
        shipping_city: input.shippingCity,
        shipping_province: input.shippingProvince,
        subtotal_pkr: summary.subtotalPkr,
        shipping_fee_pkr: summary.shippingPkr,
        cod_fee_pkr: summary.codFeePkr,
        total_pkr: summary.totalPkr,
        payment_method: input.paymentMethod,
        payment_status: isCod ? PaymentStatus.COD_PENDING : PaymentStatus.PENDING,
        order_status: OrderStatus.CONFIRMED,
        notes: input.notes,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderError) {
      // Release acquired locks if order insertion fails
      await InventoryLockService.releaseStockLocks(orderId, input.items);
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    // 4. Insert Order Items Records
    const itemInserts = input.items.map((item) => ({
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      order_id: orderId,
      product_id: item.productId,
      variant_id: item.variantId || null,
      quantity: item.quantity,
      unit_price_pkr: item.unitPricePkr || 2499,
      total_price_pkr: (item.unitPricePkr || 2499) * item.quantity,
      created_at: new Date().toISOString(),
    }));

    await supabaseAdmin.from('order_items').insert(itemInserts);

    // 5. For COD orders, auto-commit stock reservation
    if (isCod) {
      await InventoryLockService.commitStockDecrement(orderId, input.items);
    }

    // 6. Auto-book PostEx Courier
    const shipment = await CourierService.bookCourierShipment({
      orderId: order?.id || orderId,
      orderNumber,
      customerName: input.buyerName,
      customerPhone: input.buyerPhone,
      deliveryAddress: input.shippingAddress,
      destinationCity: input.shippingCity,
      codAmountPkr: summary.totalPkr,
      isCod,
      itemsCount: input.items.reduce((s, i) => s + i.quantity, 0),
    });

    // 7. WhatsApp Confirmation Dispatch
    await WhatsAppService.sendOrderConfirmed(
      input.buyerPhone,
      orderNumber,
      summary.totalPkr,
      isCod
    );

    return {
      orderId: order?.id || orderId,
      orderNumber,
      summary,
      shipment,
      status: OrderStatus.CONFIRMED,
    };
  }

  /**
   * Fetches order details by ID from Supabase.
   */
  static async getOrder(id: string) {
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*), shipments(*), payments(*)')
      .eq('id', id)
      .maybeSingle();

    return order;
  }

  /**
   * Cancels an order and releases any active inventory locks.
   */
  static async cancelOrder(id: string, reason?: string) {
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', id)
      .single();

    if (!order) throw new Error('Order not found');

    const { data: updated } = await supabaseAdmin
      .from('orders')
      .update({
        order_status: OrderStatus.CANCELLED,
        notes: reason ? `Cancelled: ${reason}` : 'Cancelled by customer',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    // Release inventory reservation locks
    if (order.order_items && order.order_items.length > 0) {
      const lockItems = order.order_items.map((i: any) => ({
        productId: i.product_id,
        variantId: i.variant_id,
        quantity: i.quantity,
      }));
      await InventoryLockService.releaseStockLocks(id, lockItems);
    }

    return updated;
  }
}
