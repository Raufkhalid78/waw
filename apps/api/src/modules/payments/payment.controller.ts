import { Request, Response } from 'express';
import { SafepayService } from './safepay.service.js';
import { PayFastService } from './payfast.service.js';
import { PaymentMethod } from '@waw/types';

export class PaymentController {
  static async initiateSafepay(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.body;
      if (!orderId) {
        res.status(400).json({ error: 'orderId is required' });
        return;
      }
      const session = await SafepayService.createCheckoutSession(orderId);
      res.json(session);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async safepayWebhook(req: Request, res: Response): Promise<void> {
    try {
      await SafepayService.handleWebhook(req.body);
      res.json({ received: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async initiatePayFast(req: Request, res: Response): Promise<void> {
    try {
      const { orderId, method } = req.body;
      const session = await PayFastService.createPayFastSession(
        orderId,
        method || PaymentMethod.PAYFAST_WALLET_JAZZCASH
      );
      res.json(session);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async payfastWebhook(req: Request, res: Response): Promise<void> {
    try {
      await PayFastService.handleWebhook(req.body);
      res.json({ received: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
