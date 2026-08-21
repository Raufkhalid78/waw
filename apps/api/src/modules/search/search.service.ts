import { Request, Response } from 'express';
import { typesenseClient } from '../../config/typesense.js';
import { prisma } from '../../config/supabase.js';

export class SearchService {
  /**
   * Searches products across title, titleUrdu, description with faceted filtering.
   */
  static async search(params: {
    query?: string;
    categoryId?: string;
    storeId?: string;
    minPrice?: number;
    maxPrice?: number;
    page?: number;
    limit?: number;
  }) {
    const q = params.query || '*';
    const page = params.page || 1;
    const perPage = params.limit || 20;

    const filterConditions: string[] = [];
    if (params.categoryId) filterConditions.push(`categoryId:=${params.categoryId}`);
    if (params.storeId) filterConditions.push(`storeId:=${params.storeId}`);
    if (params.minPrice !== undefined) filterConditions.push(`basePricePkr:>=${params.minPrice}`);
    if (params.maxPrice !== undefined) filterConditions.push(`basePricePkr:<=${params.maxPrice}`);

    try {
      const searchResult = await typesenseClient.collections('products').documents().search({
        q,
        query_by: 'title,titleUrdu,description',
        filter_by: filterConditions.length ? filterConditions.join(' && ') : undefined,
        page,
        per_page: perPage,
        sort_by: 'isSponsored:desc,soldCount:desc',
      });

      const productIds = (searchResult.hits || []).map((h: any) => h.document.id);

      // Hydrate with DB variants and store info
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        include: {
          variants: true,
          store: { select: { id: true, name: true, logoUrl: true, ratingAverage: true } },
          category: true,
        },
      });

      return {
        hits: products,
        found: searchResult.found,
        page,
        totalPages: Math.ceil(searchResult.found / perPage),
      };
    } catch (err: any) {
      console.warn('⚠️ Typesense fallback to database search:', err.message);
      // Fallback to PostgreSQL search if Typesense is still starting
      const fallbackProducts = await prisma.product.findMany({
        where: params.query
          ? {
              OR: [
                { title: { contains: params.query, mode: 'insensitive' } },
                { description: { contains: params.query, mode: 'insensitive' } },
              ],
            }
          : {},
        include: { variants: true, store: true, category: true },
        take: perPage,
      });
      return { hits: fallbackProducts, found: fallbackProducts.length, page: 1, totalPages: 1 };
    }
  }
}

export class SearchController {
  static async search(req: Request, res: Response): Promise<void> {
    try {
      const { q, categoryId, storeId, minPrice, maxPrice, page, limit } = req.query;
      const result = await SearchService.search({
        query: q as string,
        categoryId: categoryId as string,
        storeId: storeId as string,
        minPrice: minPrice ? parseInt(minPrice as string, 10) : undefined,
        maxPrice: maxPrice ? parseInt(maxPrice as string, 10) : undefined,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
