import { Request, Response } from 'express';
import { PostExXPayService } from './xpay.service.js';
import { PaymentMethod } from '@waw/types';

export class PaymentController {
  /**
   * Initiates a PostEx XPay checkout intent (Cards, Raast QR, JazzCash, Easypaisa).
   */
  static async initiateXPay(req: Request, res: Response): Promise<void> {
    try {
      const { orderId, method } = req.body;
      if (!orderId) {
        res.status(400).json({ error: 'orderId is required' });
        return;
      }
      const session = await PostExXPayService.createPaymentIntent(
        orderId,
        method || PaymentMethod.XPAY_CARD
      );
      res.json(session);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Handles PostEx XPay real-time webhook callback.
   */
  static async xpayWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['x-postex-signature'] || req.headers['x-xpay-signature'] as string | undefined;
      const result = await PostExXPayService.handleWebhook(req.body);
      res.json({ received: true, ...result });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
