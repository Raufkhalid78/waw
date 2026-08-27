import { supabaseAdmin } from "../../config/supabase.js";
import { typesenseClient } from "../../config/typesense.js";
import { CategoryService } from "../categories/category.service.js";

export class ProductService {
  /**
   * Fetches paginated product catalog with category & store filters from Supabase.
   */
  static async listProducts(query: {
    categoryId?: string;
    categorySlug?: string;
    storeId?: string;
    city?: string;
    isFirstParty?: boolean;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: "featured" | "price-asc" | "price-desc" | "rating";
    limit?: number;
    page?: number;
  }) {
    const limit = query.limit || 20;
    const page = query.page || 1;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let dbQuery = supabaseAdmin
      .from("products")
      .select(
        "id, title, title_urdu, slug, description, base_price_pkr, compare_at_price_pkr, images, thumbnail, seller_type, is_first_party, category_id, store_id, is_active, variants:product_variants(id, sku, price_adjustment_pkr, stock_quantity, is_active), store:stores(id, name, slug, logo_url, city, rating_average), category:categories(id, name, name_urdu, slug)",
        { count: "exact" },
      )
      .eq("is_active", true);

    if (query.categoryId) {
      dbQuery = dbQuery.eq("category_id", query.categoryId);
    } else if (query.categorySlug) {
      const descendantIds = await CategoryService.getCategoryDescendantIds(
        query.categorySlug,
      );
      if (descendantIds.length === 1) {
        dbQuery = dbQuery.eq("category_id", descendantIds[0]);
      } else if (descendantIds.length > 1) {
        dbQuery = dbQuery.in("category_id", descendantIds);
      }
    }

    if (query.storeId) dbQuery = dbQuery.eq("store_id", query.storeId);
    if (query.isFirstParty !== undefined)
      dbQuery = dbQuery.eq("is_first_party", query.isFirstParty);
    if (query.minPrice !== undefined)
      dbQuery = dbQuery.gte("base_price_pkr", query.minPrice);
    if (query.maxPrice !== undefined)
      dbQuery = dbQuery.lte("base_price_pkr", query.maxPrice);

    if (query.sortBy === "price-asc") {
      dbQuery = dbQuery.order("base_price_pkr", { ascending: true });
    } else if (query.sortBy === "price-desc") {
      dbQuery = dbQuery.order("base_price_pkr", { ascending: false });
    } else if (query.sortBy === "rating") {
      dbQuery = dbQuery.order("rating_average", { ascending: false });
    } else {
      dbQuery = dbQuery
        .order("merchandising_rank", { ascending: false })
        .order("is_featured", { ascending: false })
        .order("sold_count", { ascending: false })
        .order("created_at", { ascending: false });
    }

    const {
      data: items,
      count,
      error,
    } = await dbQuery.range(from, to);

    if (error) {
      throw new Error(`Database error fetching products: ${error.message}`);
    }

    const total = count || 0;
    
    // Dynamically calculate applicable facets from the result set
    const validItems = items || [];
    const facets = {
      minPrice: validItems.length ? Math.min(...validItems.map((i: any) => i.base_price_pkr || 0)) : 0,
      maxPrice: validItems.length ? Math.max(...validItems.map((i: any) => i.base_price_pkr || 0)) : 0,
      cities: Array.from(new Set(validItems.map((i: any) => i.store?.city).filter(Boolean))),
      sellerTypes: Array.from(new Set(validItems.map((i: any) => i.store?.seller_type || (i.is_first_party ? 'FIRST_PARTY' : 'THIRD_PARTY')).filter(Boolean))),
      categories: Array.from(new Set(validItems.map((i: any) => i.category?.name).filter(Boolean)))
    };

    return {
      items: validItems,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      facets
    };
  }

  /**
   * Fetches a product by slug from Supabase.
   */
  static async getProductBySlug(slug: string) {
    const { data: product, error } = await supabaseAdmin
      .from("products")
      .select(
        "id, title, title_urdu, slug, description, base_price_pkr, compare_at_price_pkr, images, thumbnail, seller_type, is_first_party, category_id, store_id, is_active, variants:product_variants(id, sku, price_adjustment_pkr, stock_quantity, is_active), store:stores(id, name, slug, logo_url, city, rating_average), category:categories(id, name, name_urdu, slug), reviews(id, rating, comment, created_at, is_verified_purchase)",
      )
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      throw new Error(`Database error fetching product details: ${error.message}`);
    }

    return product;
  }

  /**
   * Creates a product in Supabase.
   */
  static async createProduct(
    data: {
      storeId?: string | null;
      title: string;
      titleUrdu?: string;
      slug: string;
      description: string;
      pricePkr: number;
      compareAtPricePkr?: number;
      categoryId: string;
      images: string[];
      isFirstParty?: boolean;
      variants?: {
        sku: string;
        title: string;
        pricePkr: number;
        stock: number;
      }[];
    },
    user?: { id: string; role: string; phone?: string },
  ) {
    // Enforce store ownership check for sellers
    if (user && user.role === "SELLER") {
      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (!store) {
        throw new Error("Seller does not have an active registered store");
      }
      if (data.storeId && store.id !== data.storeId) {
        throw new Error(
          "Unauthorized: Sellers can only create products under their own store",
        );
      }
      data.storeId = store.id;
      data.isFirstParty = false;
    }

    const isFirstParty =
      data.isFirstParty ??
      (data.storeId === null || data.storeId === undefined);

    const { data: product, error } = await supabaseAdmin
      .from("products")
      .insert({
        id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        store_id: isFirstParty ? null : data.storeId,
        title: data.title,
        title_urdu: data.titleUrdu,
        slug: data.slug,
        description: data.description,
        price_pkr: data.pricePkr,
        compare_at_price_pkr: data.compareAtPricePkr,
        category_id: data.categoryId,
        images: data.images,
        is_first_party: isFirstParty,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error)
      throw new Error(`Supabase product creation failed: ${error.message}`);

    // Insert variants if provided
    if (data.variants && data.variants.length > 0) {
      const variantInserts = data.variants.map((v) => ({
        id: `var_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        product_id: product.id,
        sku: v.sku,
        title: v.title,
        price_pkr: v.pricePkr,
        stock: v.stock,
      }));
      await supabaseAdmin.from("product_variants").insert(variantInserts);
    }

    return product;
  }
}
