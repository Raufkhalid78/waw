import { Request, Response } from "express";
import { logger } from "../../config/logger.js";
import { ReferralService } from "./referral.service.js";

export class ReferralController {
  /**
   * POST /api/referrals/generate — Generate unique referral code
   */
  static async generateCode(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const code = await ReferralService.generateCode(user.id);
      res.json({ code });
    } catch (err: any) {
      logger.error("Failed to generate referral code", { error: err.message });
      res.status(500).json({ error: "Failed to generate referral code" });
    }
  }

  /**
   * GET /api/referrals/stats — Get referral stats
   */
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const stats = await ReferralService.getStats(user.id);
      res.json(stats);
    } catch (err: any) {
      logger.error("Failed to get referral stats", { error: err.message });
      res.status(500).json({ error: "Failed to get referral stats" });
    }
  }

  /**
   * POST /api/referrals/validate — Validate a referral code
   */
  static async validateCode(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.body;
      if (!code) {
        res.status(400).json({ error: "code is required" });
        return;
      }

      const result = await ReferralService.validateCode(code);
      if (!result) {
        res.status(404).json({ error: "Invalid referral code" });
        return;
      }

      res.json({ valid: true, code: result.code });
    } catch (err: any) {
      logger.error("Failed to validate referral code", { error: err.message });
      res.status(500).json({ error: "Failed to validate referral code" });
    }
  }
}
