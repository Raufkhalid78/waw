import { Request, Response } from "express";
import { typesenseClient } from "../../config/typesense.js";
import { supabaseAdmin } from "../../config/supabase.js";
import { expandRomanUrduQuery } from "./roman-urdu-dict.js";

export class SearchService {
  /**
   * Searches seller offers & catalog products across title, titleUrdu, slug, description 
   * with Roman Urdu synonym expansion and resilient Postgres fallback.
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

        const { data: offers } = await supabaseAdmin
          .from("seller_offers")
          .select(`
            id, price_pkr, original_price_pkr, condition, is_express, status,
            catalog_product:catalog_products!inner(id, title, title_urdu, slug, description, attributes, images, thumbnail, category_id, is_active, category:categories(id, name, name_urdu, slug)),
            store:stores!inner(id, name, slug, logo_url, city, rating_average, seller_type),
            variants:offer_variants(id, variant_name, price_adjustment_pkr)
          `)
          .in("catalog_product.id", productIds)
          .eq("status", "ACTIVE")
          .eq("catalog_product.is_active", true);

        hits = (offers || []).map((offer: any) => ({
          id: offer.id,
          productId: offer.catalog_product?.id,
          title: offer.catalog_product?.title,
          titleUrdu: offer.catalog_product?.title_urdu,
          slug: offer.catalog_product?.slug,
          description: offer.catalog_product?.description,
          pricePkr: offer.price_pkr,
          originalPricePkr: offer.original_price_pkr,
          imageUrl: offer.catalog_product?.thumbnail || offer.catalog_product?.images?.[0],
          images: offer.catalog_product?.images,
          thumbnail: offer.catalog_product?.thumbnail,
          storeId: offer.store?.id,
          storeName: offer.store?.name,
          sellerCity: offer.store?.city,
          sellerType: offer.store?.seller_type,
          rating: offer.store?.rating_average,
          category: offer.catalog_product?.category,
          variants: offer.variants,
          isExpress: offer.is_express,
        }));
      }
    } catch {
      // Typesense failed or offline; will fallback to Postgres below
    }

    // 2. Fallback to Supabase Postgres ILIKE Search across catalog_products & seller_offers
    if (hits.length === 0) {
      let dbQuery = supabaseAdmin
        .from("seller_offers")
        .select(`
          id, price_pkr, original_price_pkr, condition, is_express, status,
          catalog_product:catalog_products!inner(id, title, title_urdu, slug, description, attributes, images, thumbnail, category_id, is_active, category:categories(id, name, name_urdu, slug)),
          store:stores!inner(id, name, slug, logo_url, city, rating_average, seller_type),
          variants:offer_variants(id, variant_name, price_adjustment_pkr)
        `, { count: "exact" })
        .eq("status", "ACTIVE")
        .eq("catalog_product.is_active", true);

      if (!isWildcard) {
        const orClauses: string[] = [];
        for (const term of searchTerms) {
          const cleanTerm = term.replace(/[%_,]/g, "").trim();
          if (cleanTerm) {
            orClauses.push(`catalog_product.title.ilike.%${cleanTerm}%`);
            orClauses.push(`catalog_product.title_urdu.ilike.%${cleanTerm}%`);
            orClauses.push(`catalog_product.slug.ilike.%${cleanTerm}%`);
            orClauses.push(`catalog_product.description.ilike.%${cleanTerm}%`);
          }
        }
        if (orClauses.length > 0) {
          dbQuery = dbQuery.or(orClauses.join(","));
        }
      }

      if (params.categoryId)
        dbQuery = dbQuery.eq("catalog_product.category_id", params.categoryId);
      if (params.storeId) dbQuery = dbQuery.eq("store_id", params.storeId);
      if (params.minPrice !== undefined)
        dbQuery = dbQuery.gte("price_pkr", params.minPrice);
      if (params.maxPrice !== undefined)
        dbQuery = dbQuery.lte("price_pkr", params.maxPrice);

      const { data: fallbackOffers, count } = await dbQuery
        .order("created_at", { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1);

      const rawOffers = fallbackOffers || [];
      hits = rawOffers.map((offer: any) => ({
        id: offer.id,
        productId: offer.catalog_product?.id,
        title: offer.catalog_product?.title,
        titleUrdu: offer.catalog_product?.title_urdu,
        slug: offer.catalog_product?.slug,
        description: offer.catalog_product?.description,
        pricePkr: offer.price_pkr,
        originalPricePkr: offer.original_price_pkr,
        imageUrl: offer.catalog_product?.thumbnail || offer.catalog_product?.images?.[0],
        images: offer.catalog_product?.images,
        thumbnail: offer.catalog_product?.thumbnail,
        storeId: offer.store?.id,
        storeName: offer.store?.name,
        sellerCity: offer.store?.city,
        sellerType: offer.store?.seller_type,
        rating: offer.store?.rating_average,
        category: offer.catalog_product?.category,
        variants: offer.variants,
        isExpress: offer.is_express,
      }));
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
        minPrice: minPrice ? parseInt(minPrice as string, 10) : undefined,
        maxPrice: maxPrice ? parseInt(maxPrice as string, 10) : undefined,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });

      res.json(results);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
