import crypto from 'crypto';
import { ENV } from '../../config/env.js';
import { supabaseAdmin } from '../../config/supabase.js';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@waw/types';
import { CourierService } from '../logistics/courier.service.js';
import { WhatsAppService } from '../notifications/whatsapp.service.js';

export class PayFastService {
  /**
   * Initializes a PayFast Checkout session (aggregates JazzCash, Easypaisa, Bank Accounts).
   */
  static async createPayFastSession(orderId: string, method: PaymentMethod) {
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (!order) throw new Error('Order not found');

    const basketId = `PF_${order.order_number || order.orderNumber}_${Date.now()}`;
    const checkoutUrl = `https://ipg.apps.net.pk/ecommerce/api/Transaction/GetAccessToken?MERCHANT_ID=${ENV.PAYFAST_MERCHANT_ID}&BASKET_ID=${basketId}`;

    await supabaseAdmin.from('payments').insert({
      id: `pay_pf_${Date.now()}`,
      order_id: order.id,
      amount_pkr: order.total_pkr || order.totalPkr,
      payment_method: method,
      status: PaymentStatus.PENDING,
      gateway_reference: basketId,
      created_at: new Date().toISOString(),
    });

    return {
      basketId,
      checkoutUrl,
      orderNumber: order.order_number || order.orderNumber,
      totalPkr: order.total_pkr || order.totalPkr,
    };
  }

  /**
   * Processes PayFast Instant Transaction Notification (ITN) webhook.
   */
  static async handleWebhook(payload: any) {
    const basketId = payload.BASKET_ID || payload.basket_id;
    if (!basketId) throw new Error('Missing BASKET_ID in PayFast webhook');

    const { data: payment } = await supabaseAdmin
      .from('payments')
      .select('*, orders(*)')
      .eq('gateway_reference', basketId)
      .maybeSingle();

    if (!payment) throw new Error('Payment record not found');

    // Idempotency check
    if (payment.status === PaymentStatus.PAID) {
      return { status: 'ALREADY_PROCESSED', paymentId: payment.id };
    }

    await supabaseAdmin
      .from('payments')
      .update({
        status: PaymentStatus.PAID,
        raw_response: payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    await supabaseAdmin
      .from('orders')
      .update({
        payment_status: PaymentStatus.PAID,
        order_status: OrderStatus.CONFIRMED,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.order_id);

    const orderData = payment.orders || payment;
    await CourierService.bookCourierShipment({
      orderId: orderData.id,
      orderNumber: orderData.order_number || 'WAW-ORD',
      customerName: orderData.buyer_name || 'Customer',
      customerPhone: orderData.buyer_phone || '',
      deliveryAddress: orderData.shipping_address || '',
      destinationCity: orderData.shipping_city || 'Lahore',
      codAmountPkr: 0,
      isCod: false,
      itemsCount: 1,
    });

    return { success: true, paymentId: payment.id };
  }
}
