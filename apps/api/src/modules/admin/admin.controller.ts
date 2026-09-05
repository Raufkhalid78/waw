import { Request, Response } from "express";
import { AdminService } from "./admin.service.js";
import { CartAbandonmentService } from "../cart/cart-abandonment.service.js";
import { logger } from "../../config/logger.js";

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
      const { status, page = "1", limit = "50" } = req.query;
      const sellers = await AdminService.listSellers(
        status as any,
        parseInt(page as string),
        parseInt(limit as string),
      );
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
      const { page = "1", limit = "50" } = req.query;
      const payouts = await AdminService.listPayouts(
        parseInt(page as string),
        parseInt(limit as string),
      );
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

  // ── Flash Sales ────────────────────────────────────────────────────────

  static async listFlashSales(req: Request, res: Response): Promise<void> {
    try {
      const sales = await AdminService.listFlashSales();
      res.json(sales);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async createFlashSale(req: Request, res: Response): Promise<void> {
    try {
      const sale = await AdminService.createFlashSale(req.body);
      res.status(201).json(sale);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async updateFlashSale(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const sale = await AdminService.updateFlashSale(id, req.body);
      res.json(sale);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async deleteFlashSale(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await AdminService.deleteFlashSale(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async addFlashSaleItem(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { productId, salePricePkr, stockQuantity } = req.body;
      const item = await AdminService.addFlashSaleItem(id, productId, salePricePkr, stockQuantity);
      res.status(201).json(item);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async removeFlashSaleItem(req: Request, res: Response): Promise<void> {
    try {
      const { itemId } = req.params;
      await AdminService.removeFlashSaleItem(itemId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // ── Banners ────────────────────────────────────────────────────────────

  static async listBanners(req: Request, res: Response): Promise<void> {
    try {
      const banners = await AdminService.listBanners();
      res.json(banners);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async createBanner(req: Request, res: Response): Promise<void> {
    try {
      const banner = await AdminService.createBanner(req.body);
      res.status(201).json(banner);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async updateBanner(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const banner = await AdminService.updateBanner(id, req.body);
      res.json(banner);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async deleteBanner(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await AdminService.deleteBanner(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // ── Categories ─────────────────────────────────────────────────────────

  static async listCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = await AdminService.listCategories();
      res.json(categories);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const category = await AdminService.createCategory(req.body);
      res.status(201).json(category);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const category = await AdminService.updateCategory(id, req.body);
      res.json(category);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await AdminService.deleteCategory(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // ── Cart Abandonment Recovery ───────────────────────────────────────────

  static async processAbandonedCarts(req: Request, res: Response): Promise<void> {
    try {
      const abandoned = await CartAbandonmentService.getAbandonedCarts();
      let processed = 0;

      for (const cart of abandoned) {
        try {
          const items = cart.cart_snapshot || [];
          const itemCount = items.length;
          const totalEstimate = items.reduce(
            (sum: number, item: any) => sum + (item.unit_price_pkr || 0) * (item.quantity || 1),
            0,
          );

          logger.info(
            `Abandoned cart: user=${cart.user_id}, items=${itemCount}, total=~PKR ${totalEstimate}`,
            "CartAbandonment",
          );

          await CartAbandonmentService.markReminded(cart.user_id);
          processed++;
        } catch (err) {
          logger.error(`Failed to process cart for user ${cart.user_id}`, "CartAbandonment", err);
        }
      }

      res.json({ processed, total: abandoned.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
