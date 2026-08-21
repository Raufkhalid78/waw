import crypto from 'crypto';
import axios from 'axios';
import { ENV } from '../../config/env.js';
import { supabaseAdmin } from '../../config/supabase.js';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@waw/types';
import { WhatsAppService } from '../notifications/whatsapp.service.js';
import { CourierService } from '../logistics/courier.service.js';

export class SafepayService {
  private static baseUrl =
    ENV.SAFEPAY_ENVIRONMENT === 'production'
      ? 'https://api.getsafepay.com'
      : 'https://sandbox.api.getsafepay.com';

  /**
   * Initializes a Safepay Checkout session for Card / Raast payments.
   */
  static async createCheckoutSession(orderId: string) {
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (!order) throw new Error('Order not found');

    const trackerToken = `track_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const checkoutUrl = `${this.baseUrl}/checkout?beacon=${trackerToken}&env=${ENV.SAFEPAY_ENVIRONMENT}`;

    // Record initial pending payment in Supabase
    await supabaseAdmin.from('payments').insert({
      id: `pay_${Date.now()}`,
      order_id: order.id,
      amount_pkr: order.total_pkr || order.totalPkr,
      payment_method: PaymentMethod.SAFEPAY_CARD,
      status: PaymentStatus.PENDING,
      gateway_reference: trackerToken,
      created_at: new Date().toISOString(),
    });

    return {
      trackerToken,
      checkoutUrl,
      orderNumber: order.order_number || order.orderNumber,
      totalPkr: order.total_pkr || order.totalPkr,
    };
  }

  /**
   * Verifies Safepay HMAC-SHA256 webhook signature.
   */
  static verifyWebhookSignature(payload: any, signatureHeader?: string): boolean {
    if (!ENV.SAFEPAY_WEBHOOK_SECRET) return true; // dev fallback
    if (!signatureHeader) return false;

    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const expectedSignature = crypto
      .createHmac('sha256', ENV.SAFEPAY_WEBHOOK_SECRET)
      .update(payloadString)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf8'),
      Buffer.from(signatureHeader, 'utf8')
    );
  }

  /**
   * Idempotently processes Safepay Webhook confirmation event.
   */
  static async handleWebhook(payload: any, signatureHeader?: string) {
    // 1. Verify HMAC signature
    if (signatureHeader && !this.verifyWebhookSignature(payload, signatureHeader)) {
      throw new Error('Security Error: Invalid Safepay webhook HMAC signature');
    }

    const trackerToken = payload.data?.token || payload.tracker;
    if (!trackerToken) throw new Error('Missing tracker token in webhook');

    const { data: payment } = await supabaseAdmin
      .from('payments')
      .select('*, orders(*)')
      .eq('gateway_reference', trackerToken)
      .maybeSingle();

    if (!payment) throw new Error('Payment reference not found');

    // 2. Idempotency Check: Short-circuit if already PAID
    if (payment.status === PaymentStatus.PAID) {
      console.log(`ℹ️ Webhook duplicate skipped: Payment ${payment.id} is already PAID.`);
      return { status: 'ALREADY_PROCESSED', paymentId: payment.id };
    }

    // 3. Mark payment as PAID in Supabase
    await supabaseAdmin
      .from('payments')
      .update({
        status: PaymentStatus.PAID,
        raw_response: payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    // 4. Update order status to CONFIRMED
    await supabaseAdmin
      .from('orders')
      .update({
        payment_status: PaymentStatus.PAID,
        order_status: OrderStatus.CONFIRMED,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.order_id);

    // 5. Book PostEx Courier dispatch
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

    // 6. Dispatch WhatsApp confirmation
    if (orderData.buyer_phone) {
      await WhatsAppService.sendOrderConfirmed(
        orderData.buyer_phone,
        orderData.order_number,
        orderData.total_pkr,
        false
      );
    }

    return { success: true, paymentId: payment.id };
  }
}
