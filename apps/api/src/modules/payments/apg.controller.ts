import { Request, Response } from "express";
import { AlfaPaymentGatewayService } from "./apg.service.js";
import { PaymentMethod } from "../../types/index.js";
import { supabaseAdmin } from "../../config/supabase.js";
import { logger } from "../../config/logger.js";

export class ApgPaymentController {
  /**
   * POST /api/payments/apg/onsite/initiate
   * Starts an onsite APG session (Alfa Wallet / Alfalah Account).
   * The buyer enters their wallet/account number — checkout stays on waw.com.pk.
   */
  static async initiateOnsite(req: Request, res: Response): Promise<void> {
    try {
      const { orderId, method, accountNumber, customerEmail, customerPhone } = req.body;
      const user = (req as any).user;

      if (!orderId || !method || !accountNumber) {
        res.status(400).json({ error: "orderId, method, and accountNumber are required" });
        return;
      }
      if (method !== PaymentMethod.ALFA_WALLET && method !== PaymentMethod.ALFALAH_ACCOUNT) {
        res.status(400).json({ error: "method must be ALFA_WALLET or ALFALAH_ACCOUNT for onsite checkout" });
        return;
      }
      // Basic account-number sanity (APG sandbox uses 16-digit numbers)
      const acc = String(accountNumber).replace(/\s/g, "");
      if (!/^\d{8,24}$/.test(acc)) {
        res.status(400).json({ error: "accountNumber must be 8-24 digits" });
        return;
      }

      // Ownership check (same policy as XPay initiate)
      const { data: order, error } = await supabaseAdmin
        .from("orders")
        .select("id, buyer_id, buyer_phone")
        .eq("id", orderId)
        .single();
      if (error || !order) {
        res.status(404).json({ error: "Order not found" });
        return;
      }
      if (user?.role !== "ADMIN") {
        if (order.buyer_id) {
          if (!user || order.buyer_id !== user.id) {
            res.status(403).json({ error: "You can only pay for your own orders" });
            return;
          }
        } else {
          const phone = String(customerPhone || "").replace(/[\s-]/g, "");
          const orderPhone = String(order.buyer_phone || "").replace(/[\s-]/g, "");
          if (!phone || phone !== orderPhone) {
            res.status(403).json({ error: "Phone verification failed for this order" });
            return;
          }
        }
      }

      const session = await AlfaPaymentGatewayService.createOnsiteSession({
        orderId,
        method,
        accountNumber: acc,
        customerEmail,
        customerPhone,
      });

      res.json(session);
    } catch (err: any) {
      logger.error("APG onsite initiate failed", { message: err?.message });
      res.status(400).json({ error: err?.message || "Failed to initiate payment" });
    }
  }

  /**
   * POST /api/payments/apg/onsite/process
   * Submits the OTP/OTAC the buyer typed on OUR checkout page.
   */
  static async processOnsite(req: Request, res: Response): Promise<void> {
    try {
      const { authToken, method, smsOtp, smsOtac, emailOtac } = req.body;

      if (!authToken || !method) {
        res.status(400).json({ error: "authToken and method are required" });
        return;
      }
      if (method === PaymentMethod.ALFA_WALLET && !/^\d{8}$/.test(String(smsOtp || ""))) {
        res.status(400).json({ error: "smsOtp must be the 8-digit code sent to your wallet" });
        return;
      }
      if (method === PaymentMethod.ALFALAH_ACCOUNT && !/^\d{4}$/.test(String(smsOtac || ""))) {
        res.status(400).json({ error: "smsOtac must be the 4-digit code sent to your mobile" });
        return;
      }

      const result = await AlfaPaymentGatewayService.processOnsitePayment({
        authToken,
        method,
        smsOtp,
        smsOtac,
        emailOtac,
      });

      res.json(result);
    } catch (err: any) {
      logger.error("APG onsite process failed", { message: err?.message });
      res.status(400).json({ error: err?.message || "Payment processing failed" });
    }
  }

  /**
   * POST /api/payments/apg/card/checkout
   * Returns the hosted-page POST fields for card checkout (PCI redirect).
   */
  static async cardCheckout(req: Request, res: Response): Promise<void> {
    try {
      const { orderId, customerEmail, customerPhone } = req.body;
      const user = (req as any).user;

      if (!orderId) {
        res.status(400).json({ error: "orderId is required" });
        return;
      }

      const { data: order, error } = await supabaseAdmin
        .from("orders")
        .select("id, buyer_id, buyer_phone")
        .eq("id", orderId)
        .single();
      if (error || !order) {
        res.status(404).json({ error: "Order not found" });
        return;
      }
      if (user?.role !== "ADMIN") {
        if (order.buyer_id) {
          if (!user || order.buyer_id !== user.id) {
            res.status(403).json({ error: "You can only pay for your own orders" });
            return;
          }
        } else {
          const phone = String(customerPhone || "").replace(/[\s-]/g, "");
          const orderPhone = String(order.buyer_phone || "").replace(/[\s-]/g, "");
          if (!phone || phone !== orderPhone) {
            res.status(403).json({ error: "Phone verification failed for this order" });
            return;
          }
        }
      }

      const checkout = await AlfaPaymentGatewayService.createCardCheckout({
        orderId,
        customerEmail,
        customerPhone,
      });

      res.json(checkout);
    } catch (err: any) {
      logger.error("APG card checkout failed", { message: err?.message });
      res.status(400).json({ error: err?.message || "Failed to start card checkout" });
    }
  }

  /**
   * POST /api/payments/apg/ipn — APG listener callback.
   * Whitelisted in the merchant portal; settlement happens through the
   * server-to-server IPN inquiry, never from this request body alone.
   */
  static async ipnListener(req: Request, res: Response): Promise<void> {
    try {
      const result = await AlfaPaymentGatewayService.handleIpnListener(req.body || {});
      res.json(result);
    } catch (err: any) {
      logger.error("APG IPN listener error", { message: err?.message });
      res.status(500).json({ error: "IPN processing failed" });
    }
  }

  /**
   * GET /api/payments/apg/verify/:orderNumber
   * Client-pollable verification — the payment/result page calls this to
   * confirm settlement server-to-server after redirect/return.
   */
  static async verifyOrder(req: Request, res: Response): Promise<void> {
    try {
      const { orderNumber } = req.params;
      const result = await AlfaPaymentGatewayService.verifyAndSettle({ orderNumber });
      res.json(result);
    } catch (err: any) {
      logger.error("APG verify failed", { message: err?.message });
      res.status(400).json({ error: err?.message || "Verification failed" });
    }
  }
}
