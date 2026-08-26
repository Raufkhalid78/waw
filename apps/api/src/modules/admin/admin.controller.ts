import { Request, Response } from "express";
import { AdminService } from "./admin.service.js";

export class AdminController {
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await AdminService.getPlatformStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async listSellers(req: Request, res: Response): Promise<void> {
    try {
      const { status } = req.query;
      const sellers = await AdminService.listSellers(status as any);
      res.json(sellers);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async updateSeller(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, commissionRatePercentage } = req.body;
      const updated = await AdminService.updateSellerStatus(
        id,
        status,
        commissionRatePercentage,
      );
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async listPayouts(req: Request, res: Response): Promise<void> {
    try {
      const payouts = await AdminService.listPayouts();
      res.json(payouts);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async settlePayout(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { bankReference } = req.body;
      const settled = await AdminService.settlePayout(id, bankReference);
      res.json(settled);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
