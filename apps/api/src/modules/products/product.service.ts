import { supabaseAdmin } from "../../config/supabase.js";
import { typesenseClient } from "../../config/typesense.js";
import { CategoryService } from "../categories/category.service.js";

export class ProductService {
  /**
   * Fetches paginated active seller_offers with catalog_products
   */
  static async listProducts(query: {
    categoryId?: string;
    categorySlug?: string;
    storeId?: string;
    city?: string;
    inStock?: boolean;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    sortBy?: "featured" | "price-asc" | "price-desc" | "rating";
    limit?: number;
    page?: number;
  }) {
    const limit = query.limit || 20;
    const page = query.page || 1;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let dbQuery = supabaseAdmin
      .from("seller_offers")
      .select(`
        id, 
        price_pkr, 
        original_price_pkr, 
        is_express, 
        catalog_product:catalog_products!inner(id, title, slug, thumbnail, images, category_id, is_active),
        store:stores!inner(id, name, slug, city, rating_average, seller_type),
        variants:offer_variants(id, variant_name, price_adjustment_pkr)
      `, { count: "exact" })
      .eq("status", "ACTIVE")
      .eq("catalog_product.is_active", true);

    if (query.city && query.city !== "All Cities") {
      dbQuery = dbQuery.ilike("store.city", `%${query.city}%`);
    }

    if (query.categoryId) {
      dbQuery = dbQuery.eq("catalog_product.category_id", query.categoryId);
    } else if (query.categorySlug) {
      const descendantIds = await CategoryService.getCategoryDescendantIds(query.categorySlug);
      if (descendantIds.length === 1) {
        dbQuery = dbQuery.eq("catalog_product.category_id", descendantIds[0]);
      } else if (descendantIds.length > 1) {
        dbQuery = dbQuery.in("catalog_product.category_id", descendantIds);
      }
    }

    if (query.storeId) dbQuery = dbQuery.eq("store_id", query.storeId);
    if (query.minPrice !== undefined) dbQuery = dbQuery.gte("price_pkr", query.minPrice);
    if (query.maxPrice !== undefined) dbQuery = dbQuery.lte("price_pkr", query.maxPrice);

    if (query.sortBy === "price-asc") {
      dbQuery = dbQuery.order("price_pkr", { ascending: true });
    } else if (query.sortBy === "price-desc") {
      dbQuery = dbQuery.order("price_pkr", { ascending: false });
    } else {
      dbQuery = dbQuery.order("created_at", { ascending: false });
    }

    const { data, count, error } = await dbQuery.range(from, to);
    if (error) throw new Error(`Database error fetching products: ${error.message}`);

    let items = data || [];

    // inStock filter: check inventory_ledger for available stock > 0
    // This is a post-fetch filter since stock is tracked via double-entry ledger
    if (query.inStock) {
      const { InventoryService } = await import("./inventory.service.js");
      const filteredItems = [];
      for (const offer of items) {
        // Check if offer has variants with stock > 0
        const variants = offer.variants || [];
        if (variants.length === 0) {
          // No variants listed — treat as in-stock if offer exists
          filteredItems.push(offer);
          continue;
        }
        let hasStock = false;
        for (const variant of variants) {
          const stock = await InventoryService.getAvailableStock(variant.id);
          if (stock > 0) {
            hasStock = true;
            break;
          }
        }
        if (hasStock) {
          filteredItems.push(offer);
        }
      }
      items = filteredItems;
    }

    // minRating filter (post-fetch since rating is on store, not offer)
    if (query.minRating && query.minRating > 0) {
      items = items.filter((offer: any) => {
        const rating = offer.store?.rating_average || 0;
        return rating >= query.minRating!;
      });
    }
    
    // Map to frontend expectation (product-centric view)
    const mappedItems = items.map((offer: any) => ({
      id: offer.id,
      productId: offer.catalog_product.id,
      slug: offer.catalog_product.slug,
      title: offer.catalog_product.title,
      imageUrl: (Array.isArray(offer.catalog_product.images) && offer.catalog_product.images.length > 0)
        ? offer.catalog_product.images[0]
        : offer.catalog_product.thumbnail,
      pricePkr: offer.price_pkr,
      originalPricePkr: offer.original_price_pkr,
      discountPercent: offer.original_price_pkr 
        ? Math.round(((offer.original_price_pkr - offer.price_pkr) / offer.original_price_pkr) * 100) 
        : 0,
      storeId: offer.store.id,
      storeName: offer.store.name,
      sellerCity: offer.store.city,
      sellerType: offer.store.seller_type,
      rating: offer.store.rating_average,
      reviewsCount: 0,
      soldCount: 0,
      isExpress: offer.is_express,
      variants: offer.variants
    }));

    return {
      items: mappedItems,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
      facets: {}
    };
  }

  static async getProductBySlug(slugOrId: string) {
    if (!slugOrId) return null;

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);

    // 1. Try resolving by catalog product slug or ID first
    let catQuery = supabaseAdmin
      .from("catalog_products")
      .select(`
        id, title, title_urdu, slug, description, attributes, images, thumbnail, is_active,
        category:categories(id, name, name_urdu, slug),
        offers:seller_offers(
          id, sku, price_pkr, original_price_pkr, condition, is_express, status,
          store:stores(id, name, slug, logo_url, city, rating_average, seller_type),
          variants:offer_variants(id, variant_name, price_adjustment_pkr)
        )
      `)
      .eq("is_active", true);

    if (isUUID) {
      catQuery = catQuery.or(`slug.eq.${slugOrId},id.eq.${slugOrId}`);
    } else {
      catQuery = catQuery.eq("slug", slugOrId);
    }

    const { data: catProduct, error: catError } = await catQuery.maybeSingle();

    if (catProduct) {
      const activeOffers = (catProduct.offers || []).filter((o: any) => o.status === "ACTIVE");
      const bestOffer = activeOffers[0] || catProduct.offers?.[0];
      if (bestOffer) {
        return {
          id: bestOffer.id,
          productId: catProduct.id,
          slug: catProduct.slug,
          title: catProduct.title,
          title_urdu: catProduct.title_urdu,
          description: catProduct.description,
          attributes: catProduct.attributes,
          images: catProduct.images || [],
          thumbnail: catProduct.thumbnail,
          pricePkr: bestOffer.price_pkr,
          originalPricePkr: bestOffer.original_price_pkr,
          condition: bestOffer.condition,
          isExpress: bestOffer.is_express,
          store: bestOffer.store,
          category: catProduct.category,
          variants: bestOffer.variants || []
        };
      }
    }

    // 2. Fallback: Try resolving directly by offer ID or SKU
    let offerQuery = supabaseAdmin
      .from("seller_offers")
      .select(`
        id, sku, price_pkr, original_price_pkr, condition, is_express, status,
        catalog_product:catalog_products(id, title, title_urdu, slug, description, attributes, images, thumbnail, category:categories(id, name, name_urdu, slug)),
        store:stores(id, name, slug, logo_url, city, rating_average, seller_type),
        variants:offer_variants(id, variant_name, price_adjustment_pkr)
      `);

    if (isUUID) {
      offerQuery = offerQuery.eq("id", slugOrId);
    } else {
      offerQuery = offerQuery.eq("sku", slugOrId);
    }

    const { data: offer } = await offerQuery.maybeSingle();

    if (offer && offer.catalog_product) {
      const offerData: any = offer;
      return {
        id: offerData.id,
        productId: offerData.catalog_product.id,
        slug: offerData.catalog_product.slug,
        title: offerData.catalog_product.title,
        title_urdu: offerData.catalog_product.title_urdu,
        description: offerData.catalog_product.description,
        attributes: offerData.catalog_product.attributes,
        images: offerData.catalog_product.images || [],
        thumbnail: offerData.catalog_product.thumbnail,
        pricePkr: offerData.price_pkr,
        originalPricePkr: offerData.original_price_pkr,
        condition: offerData.condition,
        isExpress: offerData.is_express,
        store: offerData.store,
        category: offerData.catalog_product.category,
        variants: offerData.variants || []
      };
    }

    return null;
  }

  static async createProduct(
    data: {
      storeId?: string | null;
      title: string;
      titleUrdu?: string;
      slug?: string;
      description: string;
      pricePkr?: number;
      originalPricePkr?: number;
      categoryId: string;
      images?: string[];
      imageUrl?: string;
      sku?: string;
      stockQuantity?: number;
      variants?: { variant_name: string, priceAdjustmentPkr?: number, stockQuantity?: number }[];
    },
    user?: { id: string; role: string; phone?: string }
  ) {
    if (user && user.role === "SELLER") {
      const { data: store } = await supabaseAdmin.from("stores").select("id").eq("owner_id", user.id).maybeSingle();
      if (!store) throw new Error("Seller does not have an active registered store");
      data.storeId = store.id;
    }

    if (!data.storeId) throw new Error("storeId is required");

    const rawImages = Array.isArray(data.images) && data.images.length > 0 ? data.images : data.imageUrl ? [data.imageUrl] : [];
    const generatedSlug = data.slug || `${data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}-${Date.now().toString().slice(-4)}`;

    const isPrivileged = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

    // 1. Create Catalog Product
    const { data: catalogProduct, error: catError } = await supabaseAdmin
      .from("catalog_products")
      .insert({
        category_id: data.categoryId,
        title: data.title,
        title_urdu: data.titleUrdu,
        slug: generatedSlug,
        description: data.description,
        images: rawImages,
        thumbnail: rawImages[0] || null,
        is_active: isPrivileged,
      }).select().single();

    if (catError) throw new Error(`Catalog creation failed: ${catError.message}`);

    // 2. Create Offer
    const { data: offer, error: offerError } = await supabaseAdmin
      .from("seller_offers")
      .insert({
        catalog_product_id: catalogProduct.id,
        store_id: data.storeId,
        sku: data.sku || `SKU-${Date.now()}`,
        price_pkr: data.pricePkr || 0,
        original_price_pkr: data.originalPricePkr || null,
        status: isPrivileged ? "ACTIVE" : "PENDING",
      }).select().single();

    if (offerError) throw new Error(`Offer creation failed: ${offerError.message}`);

    // 3. Create Variants & Inventory
    const defaultStock = data.stockQuantity ?? 0;
    if (data.variants && data.variants.length > 0) {
      for (const v of data.variants) {
        const { data: variant } = await supabaseAdmin.from("offer_variants").insert({
          offer_id: offer.id,
          variant_name: v.variant_name || 'Default',
          price_adjustment_pkr: v.priceAdjustmentPkr || 0
        }).select().single();
        
        await supabaseAdmin.from("inventory_ledger").insert({
          offer_variant_id: variant.id,
          store_id: data.storeId,
          transaction_type: 'RESTOCK',
          quantity: v.stockQuantity ?? defaultStock,
          notes: 'Initial listing stock'
        });
      }
    } else {
      const { data: variant } = await supabaseAdmin.from("offer_variants").insert({
        offer_id: offer.id,
        variant_name: 'Default',
        price_adjustment_pkr: 0
      }).select().single();
      
      await supabaseAdmin.from("inventory_ledger").insert({
        offer_variant_id: variant.id,
        store_id: data.storeId,
        transaction_type: 'RESTOCK',
        quantity: defaultStock,
        notes: 'Initial listing stock'
      });
    }

    return offer;
  }
}
