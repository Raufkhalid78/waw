import { ENV } from '../../config/env.js';
import { prisma } from '../../config/supabase.js';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@waw/types';
import { WhatsAppService } from '../notifications/whatsapp.service.js';
import { CourierService } from '../logistics/courier.service.js';

export class PayFastService {
  /**
   * Generates hosted PayFast payment form parameters for Wallets (JazzCash/Easypaisa) and Cards.
   */
  static async createPayFastSession(orderId: string, method: PaymentMethod) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new Error('Order not found');

    const transactionId = `PF_${Date.now()}_${order.orderNumber}`;

    await prisma.payment.create({
      data: {
        orderId: order.id,
        amountPkr: order.totalPkr,
        paymentMethod: method,
        status: PaymentStatus.PENDING,
        gatewayReference: transactionId,
      },
    });

    return {
      merchantId: ENV.PAYFAST_MERCHANT_ID,
      transactionId,
      amountPkr: order.totalPkr,
      orderNumber: order.orderNumber,
      customerName: order.buyerName,
      customerMobile: order.buyerPhone,
      checkoutUrl: 'https://ipg.apps.net.pk/ecommerce/api/Transaction/GetAccessToken',
    };
  }

  /**
   * Handles PayFast ITN (Instant Transaction Notification) webhook.
   */
  static async handleWebhook(payload: any) {
    const transactionId = payload.basket_id || payload.transaction_id;
    const payment = await prisma.payment.findFirst({
      where: { gatewayReference: transactionId },
      include: { order: true },
    });

    if (!payment) throw new Error('Payment reference not found');

    if (payload.err_code === '000' || payload.status === 'SUCCESS') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.PAID, rawResponse: payload },
      });

      await prisma.order.update({
        where: { id: payment.orderId },
        data: { paymentStatus: PaymentStatus.PAID, orderStatus: OrderStatus.CONFIRMED },
      });

      await CourierService.bookCourierShipment(
        payment.order.id,
        payment.order.shippingCity,
        payment.order.totalPkr,
        false
      );

      await WhatsAppService.sendOrderConfirmed(
        payment.order.buyerPhone,
        payment.order.orderNumber,
        payment.order.totalPkr,
        false
      );
    }

    return { success: true };
  }
}
