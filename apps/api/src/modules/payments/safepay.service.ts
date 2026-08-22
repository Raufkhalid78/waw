import crypto from 'crypto';
import axios from 'axios';
import { ENV } from '../../config/env.js';
import { supabaseAdmin } from '../../config/supabase.js';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@waw/types';
import { WhatsAppService } from '../notifications/whatsapp.service.js';
import { CourierService } from '../logistics/courier.service.js';
import { InventoryLockService } from '../products/inventory-lock.service.js';

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

    const trackerToken = `track_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const checkoutUrl = `${this.baseUrl}/checkout/pay?beacon=${trackerToken}&amount=${order.total_pkr}&currency=PKR`;

    // Record payment attempt
    await supabaseAdmin.from('payments').insert({
      id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      order_id: order.id,
      method: PaymentMethod.SAFEPAY_CARD,
      status: PaymentStatus.PENDING,
      gateway_reference: trackerToken,
      amount_pkr: order.total_pkr,
      created_at: new Date().toISOString(),
    });

    return {
      trackerToken,
      checkoutUrl,
      orderNumber: order.order_number,
      amountPkr: order.total_pkr,
    };
  }

  /**
   * Verifies the Safepay webhook signature using timing-safe HMAC-SHA256 comparison.
   */
  static verifyWebhookSignature(payload: any, signatureHeader?: string): boolean {
    if (!signatureHeader || !ENV.SAFEPAY_WEBHOOK_SECRET) {
      console.warn('⚠️ Safepay webhook signature header or secret missing.');
      return false;
    }

    try {
      const dataToSign = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const expectedSignature = crypto
        .createHmac('sha256', ENV.SAFEPAY_WEBHOOK_SECRET)
        .update(dataToSign)
        .digest('hex');

      const expectedBuffer = Buffer.from(expectedSignature, 'hex');
      const receivedBuffer = Buffer.from(signatureHeader, 'hex');

      if (expectedBuffer.length !== receivedBuffer.length) return false;
      return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
    } catch (err: any) {
      console.error('❌ Safepay signature verification failed with error:', err.message);
      return false;
    }
  }

  /**
   * Processes Safepay webhook events idempotently and transitions order to PAID/CONFIRMED.
   */
  static async handleWebhook(payload: any, signatureHeader?: string) {
    // 1. Signature Verification
    if (ENV.NODE_ENV === 'production' || ENV.SAFEPAY_WEBHOOK_SECRET !== 'dev_safepay_secret_32chars_key_pk') {
      const isValid = this.verifyWebhookSignature(payload, signatureHeader);
      if (!isValid) {
        throw new Error('Invalid Safepay webhook signature.');
      }
    }

    const { tracker, reference, order_id } = payload.data || payload;
    const trackerToken = tracker?.token || reference || order_id;

    const { data: payment } = await supabaseAdmin
      .from('payments')
      .select('*, orders(*)')
      .eq('gateway_reference', trackerToken)
      .maybeSingle();

    if (!payment) {
      throw new Error(`Payment record not found for Safepay tracker: ${trackerToken}`);
    }

    // 2. Idempotency Check
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

    // 4. Update order status to CONFIRMED & PAID
    await supabaseAdmin
      .from('orders')
      .update({
        payment_status: PaymentStatus.PAID,
        order_status: OrderStatus.CONFIRMED,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.order_id);

    // 5. Commit Stock Decrement & Release Redis Locks
    const { data: orderItems } = await supabaseAdmin
      .from('order_items')
      .select('*')
      .eq('order_id', payment.order_id);

    if (orderItems && orderItems.length > 0) {
      const lockItems = orderItems.map((i: any) => ({
        productId: i.product_id,
        variantId: i.variant_id,
        quantity: i.quantity,
      }));
      await InventoryLockService.commitStockDecrement(payment.order_id, lockItems);
    }

    // 6. Book PostEx Courier dispatch
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
      itemsCount: orderItems?.length || 1,
    });

    // 7. Dispatch WhatsApp confirmation
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
