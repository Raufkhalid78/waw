import { Request, Response } from "express";
import { supabaseAdmin } from "../../config/supabase.js";
import { logger } from "../../config/logger.js";
import { LoyaltyService } from "./loyalty.service.js";

export class LoyaltyController {
  /**
   * GET /api/loyalty/balance — Get user's loyalty points balance
   */
  static async getBalance(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const balance = await LoyaltyService.getBalance(user.id);
      const settings = await LoyaltyService.getSettings();
      res.json({ ...balance, settings });
    } catch (err: any) {
      logger.error("Failed to get loyalty balance", { error: err.message });
      res.status(500).json({ error: "Failed to get loyalty balance" });
    }
  }

  /**
   * GET /api/loyalty/history — Get loyalty transaction history
   */
  static async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const history = await LoyaltyService.getHistory(user.id, page, limit);
      res.json(history);
    } catch (err: any) {
      logger.error("Failed to get loyalty history", { error: err.message });
      res.status(500).json({ error: "Failed to get loyalty history" });
    }
  }

  /**
   * POST /api/loyalty/redeem — Calculate redemption for checkout
   */
  static async calculateRedemption(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { orderTotalPkr } = req.body;

      if (!orderTotalPkr || orderTotalPkr <= 0) {
        res.status(400).json({ error: "orderTotalPkr is required and must be positive" });
        return;
      }

      const redemption = await LoyaltyService.calculateRedemption(user.id, orderTotalPkr);
      res.json(redemption);
    } catch (err: any) {
      logger.error("Failed to calculate redemption", { error: err.message });
      res.status(500).json({ error: "Failed to calculate redemption" });
    }
  }
}
