import { supabaseAdmin } from '../../config/supabase.js';
import { calculateOrderSummary, OrderItemPricingInput, OrderStatus, PaymentMethod, PaymentStatus, SellerType } from '@waw/types';
import { WhatsAppService } from '../notifications/whatsapp.service.js';
import { CourierService } from '../logistics/courier.service.js';

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
   * Places an order, calculates exact pricing (Free Shipping > 5000 PKR, COD fee +100 PKR),
   * records order in Supabase, and triggers WhatsApp confirmation.
   */
  static async createOrder(input: CreateOrderInput) {
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
    const orderNumber = `WAW-${Math.floor(100000 + Math.random() * 900000)}`;
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const isCod = input.paymentMethod === PaymentMethod.COD;

    // Insert order record into Supabase
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

    // Auto-book PostEx Courier
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

    // WhatsApp Confirmation Dispatch
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
}
