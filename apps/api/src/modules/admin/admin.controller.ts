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

  static async listPendingKyc(req: Request, res: Response): Promise<void> {
    try {
      const stores = await AdminService.listPendingKyc();
      res.json(stores);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async approveKyc(req: Request, res: Response): Promise<void> {
    try {
      const { storeId } = req.params;
      const { commissionRatePercentage } = req.body;
      const adminId = (req as any).user?.id;
      const approved = await AdminService.approveKyc(
        storeId,
        commissionRatePercentage,
        adminId
      );
      res.json(approved);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async rejectKyc(req: Request, res: Response): Promise<void> {
    try {
      const { storeId } = req.params;
      const { reason } = req.body;
      const adminId = (req as any).user?.id;
      const rejected = await AdminService.rejectKyc(storeId, reason, adminId);
      res.json(rejected);
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

  static async listAllProducts(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, search } = req.query;
      const result = await AdminService.listAllProducts({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        search: search as string,
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async listAllOrders(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, status } = req.query;
      const result = await AdminService.listAllOrders({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        status: status as string,
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async listAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, role } = req.query;
      const result = await AdminService.listAllUsers({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        role: role as string,
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async banUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminId = (req as any).user?.id;
      const banned = await AdminService.banUser(id, adminId);
      res.json(banned);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async unbanUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminId = (req as any).user?.id;
      const unbanned = await AdminService.unbanUser(id, adminId);
      res.json(unbanned);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
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
      const { SupportService } = await import("../support/support.service.js");
      const disputes = await SupportService.listAllDisputes(req.query.status as string);
      res.json(disputes);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async resolveDispute(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { resolution, refundAmountPkr, staffNotes } = req.body;
      const adminId = (req as any).user?.id;
      const { SupportService } = await import("../support/support.service.js");
      const resolved = await SupportService.resolveDispute(
        id,
        { resolution, refundAmountPkr, staffNotes },
        adminId
      );
      res.json(resolved);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async listReturns(req: Request, res: Response): Promise<void> {
    try {
      const { status } = req.query;
      const returns = await AdminService.listReturns(status as string);
      res.json(returns);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async receiveReturn(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { staffNotes } = req.body;
      const adminId = (req as any).user?.id;
      const received = await AdminService.receiveReturn(id, adminId, staffNotes);
      res.json(received);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async approveReturnRefund(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { staffNotes } = req.body;
      const adminId = (req as any).user?.id;
      const approved = await AdminService.approveReturnRefund(id, adminId, staffNotes);
      res.json(approved);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async rejectReturn(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminId = (req as any).user?.id;
      const rejected = await AdminService.rejectReturn(id, reason, adminId);
      res.json(rejected);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
