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
      const adminId = (req as any).user?.id;
      const settled = await AdminService.settlePayout(id, bankReference, adminId);
      res.json(settled);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async listPendingProducts(req: Request, res: Response): Promise<void> {
    try {
      const products = await AdminService.listPendingProducts();
      res.json(products);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async approveProduct(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminId = (req as any).user?.id;
      const approved = await AdminService.approveProduct(id, adminId);
      res.json(approved);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async rejectProduct(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminId = (req as any).user?.id;
      const rejected = await AdminService.rejectProduct(id, reason, adminId);
      res.json(rejected);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async listPendingReviews(req: Request, res: Response): Promise<void> {
    try {
      const reviews = await AdminService.listPendingReviews();
      res.json(reviews);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async approveReview(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminId = (req as any).user?.id;
      const approved = await AdminService.approveReview(id, adminId);
      res.json(approved);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async rejectReview(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminId = (req as any).user?.id;
      const rejected = await AdminService.rejectReview(id, adminId);
      res.json(rejected);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async listDisputes(req: Request, res: Response): Promise<void> {
    try {
      const disputes = await AdminService.listDisputes();
      res.json(disputes);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async resolveDispute(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { resolution, refundAmountPkr } = req.body;
      const adminId = (req as any).user?.id;
      const resolved = await AdminService.resolveDispute(
        id,
        resolution,
        refundAmountPkr,
        adminId
      );
      res.json(resolved);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
