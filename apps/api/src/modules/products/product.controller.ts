import { Request, Response } from "express";
import { ProductService } from "./product.service.js";

export class ProductController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const {
        categoryId,
        categorySlug,
        storeId,
        city,
        isFirstParty,
        inStock,
        minPrice,
        maxPrice,
        minRating,
        sortBy,
        page,
        limit,
      } = req.query;

      // Safe numeric parsing — never let NaN/garbage reach Supabase
      const parseSafeInt = (val: any, fallback: number, min: number, max: number): number => {
        const n = parseInt(String(val ?? ""), 10);
        if (isNaN(n)) return fallback;
        return Math.min(Math.max(n, min), max);
      };

      const result = await ProductService.listProducts({
        categoryId: categoryId as string,
        categorySlug: categorySlug as string,
        storeId: storeId as string,
        city: city as string,
        inStock: inStock === "true" ? true : undefined,
        minPrice: minPrice !== undefined ? parseSafeInt(minPrice, 0, 0, 10_000_000) : undefined,
        maxPrice: maxPrice !== undefined ? parseSafeInt(maxPrice, 0, 0, 10_000_000) : undefined,
        minRating: minRating !== undefined ? Math.min(Math.max(parseFloat(String(minRating)) || 0, 0), 5) : undefined,
        sortBy: sortBy as any,
        page: parseSafeInt(page, 1, 1, 1000),
        limit: parseSafeInt(limit, 20, 1, 100),
      });

      // Enrich items with badges (best seller, waw deal, new arrival)
      const enrichedItems = await Promise.all(
        result.items.map(async (item: any) => {
          const badges = await ProductService.computeBadges(item.productId, item.discountPercent, item.createdAt);
          return { ...item, badges };
        })
      );

      res.json({ ...result, items: enrichedItems });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  }

  static async bestSellers(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
      const items = await ProductService.getBestSellers(limit);
      res.json({ items });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch best sellers" });
    }
  }

  static async getBySlug(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;
      const product = await ProductService.getProductBySlug(slug);
      if (!product) {
        res.status(404).json({ error: "Product not found" });
        return;
      }
      res.json(product);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch product" });
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const product = await ProductService.createProduct(req.body, user);
      res.status(201).json(product);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      if (!user?.id) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const result = await ProductService.updateProduct(req.params.id, req.body, {
        id: user.id,
        role: user.role,
      });
      res.json(result);
    } catch (err: any) {
      const unauthorized = /not authorized/i.test(err.message || "");
      res.status(unauthorized ? 403 : 400).json({ error: err.message });
    }
  }

  static async remove(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      if (!user?.id) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const result = await ProductService.deleteProduct(req.params.id, {
        id: user.id,
        role: user.role,
      });
      res.json(result);
    } catch (err: any) {
      const unauthorized = /not authorized/i.test(err.message || "");
      res.status(unauthorized ? 403 : 404).json({ error: err.message });
    }
  }
}
