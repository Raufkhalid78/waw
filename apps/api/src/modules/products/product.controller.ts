import { Request, Response } from 'express';
import { ProductService } from './product.service.js';

export class ProductController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const { categoryId, storeId, isFirstParty, page, limit } = req.query;
      const result = await ProductService.listProducts({
        categoryId: categoryId as string,
        storeId: storeId as string,
        isFirstParty: isFirstParty !== undefined ? isFirstParty === 'true' : undefined,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getBySlug(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;
      const product = await ProductService.getProductBySlug(slug);
      if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }
      res.json(product);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
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
}
