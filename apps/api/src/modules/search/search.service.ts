import { Request, Response } from "express";
import { typesenseClient } from "../../config/typesense.js";
import { supabaseAdmin } from "../../config/supabase.js";

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
    const q = params.query || "*";
    const page = params.page || 1;
    const perPage = params.limit || 20;

    let hits: any[] = [];
    let found = 0;

    // Attempt Typesense first
    try {
      const filterConditions: string[] = [];
      if (params.categoryId)
        filterConditions.push(`categoryId:=${params.categoryId}`);
      if (params.storeId) filterConditions.push(`storeId:=${params.storeId}`);
      if (params.minPrice !== undefined)
        filterConditions.push(`basePricePkr:>=${params.minPrice}`);
      if (params.maxPrice !== undefined)
        filterConditions.push(`basePricePkr:<=${params.maxPrice}`);

      const searchResult = await typesenseClient
        .collections("products")
        .documents()
        .search({
          q,
          query_by: "title,titleUrdu,description",
          filter_by: filterConditions.length
            ? filterConditions.join(" && ")
            : undefined,
          page,
          per_page: perPage,
          sort_by: "isSponsored:desc,soldCount:desc",
        });

      const productIds = (searchResult.hits || []).map(
        (h: any) => h.document.id,
      );
      found = searchResult.found;

      // Hydrate with Supabase DB
      if (productIds.length > 0) {
        const { data: products } = await supabaseAdmin
          .from("products")
          .select(
            "id, title, title_urdu, slug, description, base_price_pkr, compare_at_price_pkr, images, thumbnail, seller_type, is_first_party, category_id, store_id, is_active, is_featured, is_sponsored, sold_count, merchandising_rank, variants:product_variants(id, sku, price_adjustment_pkr, stock_quantity, is_active), store:stores(id, name, slug, logo_url, city, rating_average), category:categories(id, name, name_urdu, slug)",
          )
          .in("id", productIds)
          .eq("is_active", true);

        hits = products || [];
      }
    } catch (err: any) {
      // Fallback to Supabase PostgreSQL search
      let dbQuery = supabaseAdmin
        .from("products")
        .select(
          "id, title, title_urdu, slug, description, base_price_pkr, compare_at_price_pkr, images, thumbnail, seller_type, is_first_party, category_id, store_id, is_active, is_featured, is_sponsored, sold_count, merchandising_rank, variants:product_variants(id, sku, price_adjustment_pkr, stock_quantity, is_active), store:stores(id, name, slug, logo_url, city, rating_average), category:categories(id, name, name_urdu, slug)",
          { count: "exact" },
        )
        .eq("is_active", true);

      if (params.query && params.query !== "*") {
        dbQuery = dbQuery.or(
          `title.ilike.%${params.query}%,description.ilike.%${params.query}%`,
        );
      }
      if (params.categoryId)
        dbQuery = dbQuery.eq("category_id", params.categoryId);
      if (params.storeId) dbQuery = dbQuery.eq("store_id", params.storeId);
      if (params.minPrice !== undefined)
        dbQuery = dbQuery.gte("base_price_pkr", params.minPrice);
      if (params.maxPrice !== undefined)
        dbQuery = dbQuery.lte("base_price_pkr", params.maxPrice);

      const { data: fallbackProducts, count } = await dbQuery
        .order("merchandising_rank", { ascending: false })
        .order("sold_count", { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1);

      hits = fallbackProducts || [];
      found = count || hits.length;
    }

    // Extract dynamic JSONB facets from the returned hits
    const facets: Record<string, string[]> = {};
    for (const p of hits) {
      if (p.attributes && typeof p.attributes === "object") {
        for (const [key, val] of Object.entries(p.attributes)) {
          if (!facets[key]) facets[key] = [];
          if (!facets[key].includes(String(val))) {
            facets[key].push(String(val));
          }
        }
      }
    }

    return {
      hits,
      found,
      page,
      totalPages: Math.ceil((found || 1) / perPage),
      facets,
    };
  }
}

export class SearchController {
  static async search(req: Request, res: Response): Promise<void> {
    try {
      const { q, categoryId, storeId, minPrice, maxPrice, page, limit } =
        req.query;
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
