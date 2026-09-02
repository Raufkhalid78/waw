import { Request, Response } from "express";
import { PostExXPayService } from "./xpay.service.js";
import { PaymentMethod } from "../../types/index.js";
import { supabaseAdmin } from "../../config/supabase.js";

export class PaymentController {
  /**
   * Initiates a PostEx XPay checkout intent (Cards, Raast QR, JazzCash, Easypaisa).
   * Verifies the authenticated user owns the order before initiating payment.
   */
  static async initiateXPay(req: Request, res: Response): Promise<void> {
    try {
      const { orderId, method } = req.body;
      const user = (req as any).user;

      if (!orderId) {
        res.status(400).json({ error: "orderId is required" });
        return;
      }

      // Ownership check: verify the order belongs to the authenticated user (unless admin)
      if (user.role !== "ADMIN") {
        const { data: order, error } = await supabaseAdmin
          .from("orders")
          .select("id, buyer_id")
          .eq("id", orderId)
          .single();

        if (error || !order) {
          res.status(404).json({ error: "Order not found" });
          return;
        }

        if (order.buyer_id !== user.id) {
          res.status(403).json({ error: "Forbidden: You can only initiate payment for your own orders" });
          return;
        }
      }

      const session = await PostExXPayService.createPaymentIntent(
        orderId,
        method || PaymentMethod.XPAY_CARD,
      );
      res.json(session);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Handles PostEx XPay real-time webhook callback.
   */
  static async xpayWebhook(req: any, res: Response): Promise<void> {
    try {
      const signature =
        req.headers["x-postex-signature"] ||
        (req.headers["x-xpay-signature"] as string | undefined);
      const rawBody = req.rawBody || JSON.stringify(req.body);

      const isValid = PostExXPayService.verifyWebhookSignature(
        rawBody,
        signature as string | undefined,
      );
      if (!isValid) {
        res.status(401).json({ error: "Invalid XPay webhook signature" });
        return;
      }

      const result = await PostExXPayService.handleWebhook(req.body);
      res.json({ received: true, ...result });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
