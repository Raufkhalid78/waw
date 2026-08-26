import { Request, Response } from "express";
import { CategoryService } from "./category.service.js";

export class CategoryController {
  static async listTree(req: Request, res: Response): Promise<void> {
    try {
      const locale = (req.query.locale as string) || "en";
      const tree = await CategoryService.getCategoryTree(locale);
      res.json(tree);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getBySlug(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;
      const category = await CategoryService.getCategoryBySlug(slug);
      if (!category) {
        res.status(404).json({ error: "Category not found" });
        return;
      }
      res.json(category);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
