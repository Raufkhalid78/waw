import { Request, Response } from "express";
import { typesenseClient } from "../../config/typesense.js";
import { supabaseAdmin } from "../../config/supabase.js";
import { expandRomanUrduQuery } from "./roman-urdu-dict.js";

export class SearchService {
  /**
   * Searches products across title, titleUrdu, slug, description with Roman Urdu synonym expansion and resilient fallback.
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
    const rawQuery = params.query?.trim() || "";
    const isWildcard = !rawQuery || rawQuery === "*";
    const page = params.page || 1;
    const perPage = params.limit || 20;

    const synonyms = isWildcard ? [] : expandRomanUrduQuery(rawQuery);
    const searchTerms = isWildcard
      ? ["*"]
      : Array.from(new Set([rawQuery, ...synonyms]));

    let hits: any[] = [];
    let found = 0;

    // 1. Attempt Typesense Search first if available
    try {
      const filterConditions: string[] = [];
      if (params.categoryId)
        filterConditions.push(`categoryId:=${params.categoryId}`);
      if (params.storeId) filterConditions.push(`storeId:=${params.storeId}`);
      if (params.minPrice !== undefined)
        filterConditions.push(`basePricePkr:>=${params.minPrice}`);
      if (params.maxPrice !== undefined)
        filterConditions.push(`basePricePkr:<=${params.maxPrice}`);

      const typesenseQ = isWildcard ? "*" : searchTerms.join(" ");

      const searchResult = await typesenseClient
        .collections("products")
        .documents()
        .search({
          q: typesenseQ,
          query_by: "title,titleUrdu,description",
          filter_by: filterConditions.length
            ? filterConditions.join(" && ")
            : undefined,
          page,
          per_page: perPage,
          sort_by: "isSponsored:desc,soldCount:desc",
        });

      if (searchResult.hits && searchResult.hits.length > 0) {
        const productIds = searchResult.hits.map((h: any) => h.document.id);
        found = searchResult.found;

        const { data: products } = await supabaseAdmin
          .from("products")
          .select(
            "id, title, title_urdu, slug, description, base_price_pkr, compare_at_price_pkr, images, thumbnail, seller_type, is_first_party, category_id, store_id, is_active, status, is_featured, is_sponsored, sold_count, merchandising_rank, variants:product_variants(id, sku, price_adjustment_pkr, stock_quantity, is_active), store:stores(id, name, slug, logo_url, city, rating_average), category:categories(id, name, name_urdu, slug)",
          )
          .in("id", productIds)
          .eq("is_active", true)
          .eq("status", "ACTIVE");

        hits = products || [];
      }
    } catch {
      // Typesense failed or offline; will fallback to Postgres below
    }

    // 2. Fallback to Supabase Postgres Full/ILIKE Search if Typesense yielded 0 hits
    if (hits.length === 0) {
      let dbQuery = supabaseAdmin
        .from("products")
        .select(
          "id, title, title_urdu, slug, description, base_price_pkr, compare_at_price_pkr, images, thumbnail, seller_type, is_first_party, category_id, store_id, is_active, status, is_featured, is_sponsored, sold_count, merchandising_rank, variants:product_variants(id, sku, price_adjustment_pkr, stock_quantity, is_active), store:stores(id, name, slug, logo_url, city, rating_average), category:categories(id, name, name_urdu, slug)",
          { count: "exact" },
        )
        .eq("is_active", true)
        .eq("status", "ACTIVE");

      if (!isWildcard) {
        // Build OR clauses for query and all synonyms
        const orClauses: string[] = [];
        for (const term of searchTerms) {
          const cleanTerm = term.replace(/[%_,]/g, "").trim();
          if (cleanTerm) {
            orClauses.push(`title.ilike.%${cleanTerm}%`);
            orClauses.push(`title_urdu.ilike.%${cleanTerm}%`);
            orClauses.push(`slug.ilike.%${cleanTerm}%`);
            orClauses.push(`description.ilike.%${cleanTerm}%`);
          }
        }
        if (orClauses.length > 0) {
          dbQuery = dbQuery.or(orClauses.join(","));
        }
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
