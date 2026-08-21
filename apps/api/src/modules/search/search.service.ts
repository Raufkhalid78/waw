import { Request, Response } from 'express';
import { typesenseClient } from '../../config/typesense.js';
import { supabaseAdmin } from '../../config/supabase.js';

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

      // Hydrate with Supabase DB
      const { data: products } = await supabaseAdmin
        .from('products')
        .select('*, variants:product_variants(*), store:stores(id, name, logo_url, rating_average), category:categories(*)')
        .in('id', productIds);

      return {
        hits: products || [],
        found: searchResult.found,
        page,
        totalPages: Math.ceil(searchResult.found / perPage),
      };
    } catch (err: any) {
      // Fallback to Supabase PostgreSQL full-text search
      let dbQuery = supabaseAdmin
        .from('products')
        .select('*, variants:product_variants(*), store:stores(id, name, logo_url, rating_average), category:categories(*)', { count: 'exact' });

      if (params.query) {
        dbQuery = dbQuery.or(`title.ilike.%${params.query}%,description.ilike.%${params.query}%`);
      }
      if (params.categoryId) dbQuery = dbQuery.eq('category_id', params.categoryId);
      if (params.storeId) dbQuery = dbQuery.eq('store_id', params.storeId);

      const { data: fallbackProducts, count } = await dbQuery
        .range((page - 1) * perPage, page * perPage - 1);

      return {
        hits: fallbackProducts || [],
        found: count || (fallbackProducts ? fallbackProducts.length : 0),
        page,
        totalPages: Math.ceil((count || 1) / perPage),
      };
    }
  }
}

export class SearchController {
  static async search(req: Request, res: Response): Promise<void> {
    try {
      const { q, categoryId, storeId, minPrice, maxPrice, page, limit } = req.query;
      const results = await SearchService.search({
        query: q as string,
        categoryId: categoryId as string,
        storeId: storeId as string,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
