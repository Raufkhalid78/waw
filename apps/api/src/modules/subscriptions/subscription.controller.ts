import { Request, Response } from "express";
import { logger } from "../../config/logger.js";
import { SubscriptionService } from "./subscription.service.js";
import { supabaseAdmin } from "../../config/supabase.js";

export class SubscriptionController {
  /**
   * GET /api/subscriptions/plans — Get all available plans
   */
  static async getPlans(_req: Request, res: Response): Promise<void> {
    try {
      const plans = await SubscriptionService.getPlans();
      res.json({ plans });
    } catch (err: any) {
      logger.error("Failed to get plans", { error: err.message });
      res.status(500).json({ error: "Failed to get plans" });
    }
  }

  /**
   * GET /api/seller/subscription — Get current subscription
   */
  static async getCurrentSubscription(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!store) {
        res.status(404).json({ error: "Store not found" });
        return;
      }

      const subscription = await SubscriptionService.getStoreSubscription(store.id);
      const productCheck = await SubscriptionService.canAddProduct(store.id);

      res.json({ ...subscription, productCheck });
    } catch (err: any) {
      logger.error("Failed to get subscription", { error: err.message });
      res.status(500).json({ error: "Failed to get subscription" });
    }
  }

  /**
   * POST /api/seller/subscribe — Subscribe to a plan.
   * Paid plans return an XPay checkout session; the subscription activates
   * via the payment webhook. Free plan activates immediately.
   */
  static async subscribe(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { plan } = req.body;

      if (!plan) {
        res.status(400).json({ error: "plan is required" });
        return;
      }

      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!store) {
        res.status(404).json({ error: "Store not found" });
        return;
      }

      // Look up plan price to decide flow
      const { data: planData } = await supabaseAdmin
        .from("subscription_plans")
        .select("price_pkr")
        .eq("name", plan)
        .single();

      if (!planData) {
        res.status(400).json({ error: "Invalid plan" });
        return;
      }

      if (planData.price_pkr === 0) {
        const subscription = await SubscriptionService.subscribe(store.id, plan);
        res.json({ subscription, paymentRequired: false });
        return;
      }

      // Paid plan: create PENDING subscription + XPay checkout session
      const payment = await SubscriptionService.initiateSubscriptionPayment(store.id, plan);
      res.json({ paymentRequired: true, ...payment });
    } catch (err: any) {
      logger.error("Failed to subscribe", { error: err.message });
      res.status(400).json({ error: err.message });
    }
  }

  /**
   * DELETE /api/seller/subscription — Cancel subscription
   */
  static async cancel(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!store) {
        res.status(404).json({ error: "Store not found" });
        return;
      }

      await SubscriptionService.cancel(store.id);
      res.json({ message: "Subscription cancelled, downgraded to Free plan" });
    } catch (err: any) {
      logger.error("Failed to cancel subscription", { error: err.message });
      res.status(500).json({ error: "Failed to cancel subscription" });
    }
  }
}
