import { Request, Response } from "express";
import { supabaseAdmin } from "../../config/supabase.js";
import { logger } from "../../config/logger.js";
import { RefundService } from "./refund.service.js";
import { UserRole } from "../../types/index.js";

export class PaymentController {
  /**
   * POST /api/payments/refunds/:refundId/complete
   * Finance completes an out-of-band (MANUAL_REVIEW) refund after executing
   * the bank transfer via the Bank Alfalah settlement portal. Admin-only.
   */
  static async completeManualRefund(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      if (user?.role !== UserRole.ADMIN && user?.role !== UserRole.SUPER_ADMIN && user?.role !== UserRole.FINANCE) {
        res.status(403).json({ error: "Admin or finance role required" });
        return;
      }

      const { refundId } = req.params;
      const { bankReference } = req.body || {};
      if (!bankReference) {
        res.status(400).json({ error: "bankReference is required" });
        return;
      }

      const result = await RefundService.completeManualRefund({
        refundId,
        bankReference,
        executedBy: user?.id,
      });

      if (result.status === "FAILED") {
        res.status(400).json({ error: result.reason });
        return;
      }
      res.json(result);
    } catch (err: any) {
      logger.error("Manual refund completion failed", { message: err?.message });
      res.status(500).json({ error: "Failed to complete refund" });
    }
  }

  /**
   * GET /api/payments/methods — active payment configuration for clients.
   * Driven by env-backed FEATURES so storefronts render only what is live.
   */
  static async listMethods(_req: Request, res: Response): Promise<void> {
    try {
      const { FEATURES } = await import("../../config/env.js");
      res.json({
        methods: {
          cod: true,
          alfaWallet: FEATURES.APG_ENABLED,
          alfalahAccount: FEATURES.APG_ENABLED,
          alfaCard: FEATURES.APG_ENABLED,
          raastQr: Boolean(process.env.RAAST_MERCHANT_ALIAS),
        },
      });
    } catch {
      res.json({ methods: { cod: true, alfaWallet: false, alfalahAccount: false, alfaCard: false, raastQr: false } });
    }
  }
}
