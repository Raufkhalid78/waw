import { Request, Response } from "express";
import { PostExXPayService } from "./xpay.service.js";
import { PaymentMethod } from "../../types/index.js";
import { supabaseAdmin } from "../../config/supabase.js";
import { logger } from "../../config/logger.js";

export class PaymentController {
  /**
   * Initiates a PostEx XPay checkout intent (Cards, Raast QR, JazzCash, Easypaisa).
   * Verifies the authenticated user owns the order before initiating payment.
   */
  static async initiateXPay(req: Request, res: Response): Promise<void> {
    try {
      const { orderId, method, customerPhone } = req.body;
      const user = (req as any).user;

      if (!orderId) {
        res.status(400).json({ error: "orderId is required" });
        return;
      }

      // Ownership check: verify the order belongs to the authenticated user (unless admin)
      if (user?.role !== "ADMIN") {
        const { data: order, error } = await supabaseAdmin
          .from("orders")
          .select("id, buyer_id, buyer_phone")
          .eq("id", orderId)
          .single();

        if (error || !order) {
          res.status(404).json({ error: "Order not found" });
          return;
        }

        if (order.buyer_id) {
          // Account order: must be the owner
          if (!user || order.buyer_id !== user.id) {
            res.status(403).json({ error: "Forbidden: You can only initiate payment for your own orders" });
            return;
          }
        } else {
          // Guest orders (buyer_id NULL): guest must prove ownership by
          // supplying the exact phone the order was placed with.
          const phone = String(customerPhone || "").replace(/[\s-]/g, "");
          const orderPhone = String(order.buyer_phone || "").replace(/[\s-]/g, "");
          if (!phone || phone !== orderPhone) {
            res.status(403).json({ error: "Forbidden: Phone verification failed for this order" });
            return;
          }
        }
      }

      const session = await PostExXPayService.createPaymentIntent(
        orderId,
        method || PaymentMethod.XPAY_CARD,
      );
      res.json(session);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to initiate payment" });
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
      // Never echo provider/internal errors to the webhook caller.
      logger.error("XPay webhook processing failed", { message: err?.message });
      res.status(500).json({ error: "Webhook processing failed" });
    }
  }
}
