import axios from 'axios';
import { ENV } from '../../config/env.js';
import { prisma } from '../../config/supabase.js';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@waw/types';
import { WhatsAppService } from '../notifications/whatsapp.service.js';
import { CourierService } from '../logistics/courier.service.js';

export class SafepayService {
  private static baseUrl =
    ENV.SAFEPAY_ENVIRONMENT === 'production'
      ? 'https://api.getsafepay.com'
      : 'https://sandbox.api.getsafepay.com';

  /**
   * Initializes a Safepay Checkout session for card / Raast payments.
   */
  static async createCheckoutSession(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new Error('Order not found');

    // In a real Safepay setup, we request tracker token from Safepay API:
    // POST /order/v1/init
    const trackerToken = `track_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const checkoutUrl = `${this.baseUrl}/checkout?beacon=${trackerToken}&env=${ENV.SAFEPAY_ENVIRONMENT}`;

    // Record initial pending payment
    await prisma.payment.create({
      data: {
        orderId: order.id,
        amountPkr: order.totalPkr,
        paymentMethod: PaymentMethod.SAFEPAY_CARD,
        status: PaymentStatus.PENDING,
        gatewayReference: trackerToken,
      },
    });

    return {
      trackerToken,
      checkoutUrl,
      orderNumber: order.orderNumber,
      totalPkr: order.totalPkr,
    };
  }

  /**
   * Processes Safepay Webhook confirmation event.
   */
  static async handleWebhook(payload: any) {
    const trackerToken = payload.data?.token || payload.tracker;
    if (!trackerToken) throw new Error('Missing tracker token in webhook');

    const payment = await prisma.payment.findFirst({
      where: { gatewayReference: trackerToken },
      include: { order: true },
    });

    if (!payment) throw new Error('Payment reference not found');

    // Update payment & order status to PAID / CONFIRMED
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PAID,
        rawResponse: payload,
      },
    });

    await prisma.order.update({
      where: { id: payment.orderId },
      data: {
        paymentStatus: PaymentStatus.PAID,
        orderStatus: OrderStatus.CONFIRMED,
      },
    });

    // Auto-book Courier for delivery
    await CourierService.bookCourierShipment(
      payment.order.id,
      payment.order.shippingCity,
      payment.order.totalPkr,
      false
    );

    // Dispatch WhatsApp Receipt
    await WhatsAppService.sendOrderConfirmed(
      payment.order.buyerPhone,
      payment.order.orderNumber,
      payment.order.totalPkr,
      false
    );

    return { success: true };
  }
}
