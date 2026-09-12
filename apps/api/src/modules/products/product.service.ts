import { supabaseAdmin } from "../../config/supabase.js";
import { typesenseClient } from "../../config/typesense.js";
import { redis } from "../../config/redis.js";
import { logger } from "../../config/logger.js";
import { CategoryService } from "../categories/category.service.js";
import { ConfigService } from "../admin/config.service.js";

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
        catalog_product:catalog_products!inner(id, title, slug, thumbnail, images, category_id, is_active, rating_average, rating_count),
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
    
    // Featured store boost: when no explicit sort is requested, offers from
    // Enterprise stores with an active subscription are prioritized (stable sort).
    let featuredStoreIds = new Set<string>();
    if (!query.sortBy) {
      const { data: featuredStores } = await supabaseAdmin
        .from("stores")
        .select("id")
        .eq("subscription_active", true)
        .eq("subscription_plan", "enterprise");
      featuredStoreIds = new Set((featuredStores || []).map((s: any) => s.id));
      if (featuredStoreIds.size > 0) {
        items = items
          .map((offer: any) => ({
            offer,
            featured: featuredStoreIds.has(offer.store?.id),
          }))
          .sort((a, b) => Number(b.featured) - Number(a.featured))
          .map((entry) => entry.offer);
      }
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
      rating: offer.catalog_product.rating_average || offer.store.rating_average,
      reviewsCount: offer.catalog_product.rating_count || 0,
      soldCount: 0,
      isExpress: offer.is_express,
      isFeaturedStore: !query.sortBy && featuredStoreIds.has(offer.store?.id),
      createdAt: offer.catalog_product.created_at,
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
        id, title, title_urdu, slug, description, attributes, images, thumbnail, is_active, rating_average, rating_count,
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
      const activeOffers = (catProduct.offers || []).filter((o: any) => o.status === "ACTIVE").sort((a: any, b: any) => a.price_pkr - b.price_pkr);
      const bestOffer = activeOffers[0] || catProduct.offers?.[0];
      const otherOffers = activeOffers.slice(1).map((o: any) => ({ id: o.id, pricePkr: o.price_pkr, originalPricePkr: o.original_price_pkr, condition: o.condition, isExpress: o.is_express, store: o.store }));
      if (bestOffer) {
        const [reviewsData, questionsData] = await Promise.all([
          supabaseAdmin.from('reviews').select('id, rating, comment, is_verified_purchase, created_at, seller_reply, seller_reply_at, profiles(full_name, avatar_url)').eq('product_id', catProduct.id),
          supabaseAdmin.from('product_questions').select('id, question, answer, created_at, answered_at, profiles!product_questions_user_id_fkey(full_name)').eq('product_id', catProduct.id)
        ]);

        const reviews = (reviewsData.data || []).map(r => ({ id: r.id, rating: r.rating, comment: r.comment, date: new Date(r.created_at).toLocaleDateString(), author: (r.profiles as any)?.full_name || 'Anonymous', verifiedPurchase: r.is_verified_purchase, sellerReply: r.seller_reply }));
        const questions = (questionsData.data || []).map(q => ({ id: q.id, question: q.question, answer: q.answer, author: (q.profiles as any)?.full_name || 'Anonymous' }));

        // Server-authoritative delivery estimate based on seller city tier
        const sellerCity = (Array.isArray(bestOffer.store) ? bestOffer.store[0] : bestOffer.store)?.city || await ConfigService.get("default_city") || "Lahore";
        const isExpress = bestOffer.is_express;

        const { data: sellerTierRow } = await supabaseAdmin
          .from("serviceable_cities")
          .select("tier, intra_city_days_min, intra_city_days_max, inter_tier1_days_min, inter_tier1_days_max, inter_other_days_min, inter_other_days_max")
          .ilike("city_name", sellerCity)
          .maybeSingle();

        const isSellerInTier1 = sellerTierRow?.tier === 1;
        const expressDays = isSellerInTier1
          ? { min: await ConfigService.getNumber("express_tier1_days_min", 1), max: await ConfigService.getNumber("express_tier1_days_max", 2) }
          : { min: await ConfigService.getNumber("express_other_days_min", 2), max: await ConfigService.getNumber("express_other_days_max", 3) };
        const standardDays = isSellerInTier1
          ? { min: sellerTierRow?.inter_tier1_days_min ?? await ConfigService.getNumber("standard_tier1_days_min", 3), max: sellerTierRow?.inter_tier1_days_max ?? await ConfigService.getNumber("standard_tier1_days_max", 5) }
          : { min: sellerTierRow?.inter_other_days_min ?? await ConfigService.getNumber("standard_other_days_min", 4), max: sellerTierRow?.inter_other_days_max ?? await ConfigService.getNumber("standard_other_days_max", 7) };
        const deliveryEstimate = isExpress ? expressDays : standardDays;

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
          variants: bestOffer.variants || [],
          reviews,
          reviewsCount: reviews.length,
          averageRating: reviews.length > 0
            ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
            : (catProduct.rating_average ? Number(catProduct.rating_average) : undefined),
          questions,
          otherOffers,
          deliveryEstimate
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

      const [reviewsData, questionsData] = await Promise.all([
        supabaseAdmin.from('reviews').select('id, rating, comment, is_verified_purchase, created_at, seller_reply, seller_reply_at, profiles(full_name, avatar_url)').eq('product_id', offerData.catalog_product.id),
        supabaseAdmin.from('product_questions').select('id, question, answer, created_at, answered_at, profiles!product_questions_user_id_fkey(full_name)').eq('product_id', offerData.catalog_product.id)
      ]);

      const reviews = (reviewsData.data || []).map(r => ({ id: r.id, rating: r.rating, comment: r.comment, date: new Date(r.created_at).toLocaleDateString(), author: (r.profiles as any)?.full_name || 'Anonymous', verifiedPurchase: r.is_verified_purchase, sellerReply: r.seller_reply }));
      const questions = (questionsData.data || []).map(q => ({ id: q.id, question: q.question, answer: q.answer, author: (q.profiles as any)?.full_name || 'Anonymous' }));

      // Server-authoritative delivery estimate based on seller city tier
      const sellerCity2 = (Array.isArray(offerData.store) ? offerData.store[0] : offerData.store)?.city || await ConfigService.get("default_city") || "Lahore";
      const isExpress2 = offerData.is_express;

      const { data: sellerTierRow2 } = await supabaseAdmin
        .from("serviceable_cities")
        .select("tier, intra_city_days_min, intra_city_days_max, inter_tier1_days_min, inter_tier1_days_max, inter_other_days_min, inter_other_days_max")
        .ilike("city_name", sellerCity2)
        .maybeSingle();

      const isSellerInTier1_2 = sellerTierRow2?.tier === 1;
      const expressDays2 = isSellerInTier1_2
        ? { min: await ConfigService.getNumber("express_tier1_days_min", 1), max: await ConfigService.getNumber("express_tier1_days_max", 2) }
        : { min: await ConfigService.getNumber("express_other_days_min", 2), max: await ConfigService.getNumber("express_other_days_max", 3) };
      const standardDays2 = isSellerInTier1_2
        ? { min: sellerTierRow2?.inter_tier1_days_min ?? await ConfigService.getNumber("standard_tier1_days_min", 3), max: sellerTierRow2?.inter_tier1_days_max ?? await ConfigService.getNumber("standard_tier1_days_max", 5) }
        : { min: sellerTierRow2?.inter_other_days_min ?? await ConfigService.getNumber("standard_other_days_min", 4), max: sellerTierRow2?.inter_other_days_max ?? await ConfigService.getNumber("standard_other_days_max", 7) };
      const deliveryEstimate2 = isExpress2 ? expressDays2 : standardDays2;

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
        variants: offerData.variants || [],
        reviews,
        reviewsCount: reviews.length,
        averageRating: reviews.length > 0
          ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
          : (offerData.catalog_product.rating_average ? Number(offerData.catalog_product.rating_average) : undefined),
        questions,
        otherOffers: [],
        deliveryEstimate: deliveryEstimate2
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
      categoryId?: string;
      categorySlug?: string;
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

    // Resolve category: id direct, or slug -> id (portals should never
    // hardcode database ids; slugs are stable across environments).
    let categoryId = data.categoryId;
    if (!categoryId && data.categorySlug) {
      const { data: cat } = await supabaseAdmin
        .from("categories")
        .select("id")
        .eq("slug", data.categorySlug)
        .maybeSingle();
      if (!cat) throw new Error(`Unknown category slug: ${data.categorySlug}`);
      categoryId = cat.id;
    }
    if (!categoryId) throw new Error("categoryId or categorySlug is required");

    const rawImages = Array.isArray(data.images) && data.images.length > 0 ? data.images : data.imageUrl ? [data.imageUrl] : [];
    const generatedSlug = data.slug || `${data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}-${Date.now().toString().slice(-4)}`;

    const isPrivileged = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

    // 1. Create Catalog Product
    const { data: catalogProduct, error: catError } = await supabaseAdmin
      .from("catalog_products")
      .insert({
        category_id: categoryId,
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

    // Enqueue Typesense search sync so the new listing is discoverable
    // immediately (reconcile cron also backfills hourly for resilience).
    try {
      const { JobQueueManager } = await import("../../jobs/queue.service.js");
      const storeRow = await supabaseAdmin
        .from("stores")
        .select("id, seller_type")
        .eq("id", data.storeId)
        .maybeSingle();
      await JobQueueManager.addJob("TYPESENSE_SYNC", {
        product: {
          id: catalogProduct.id,
          title: catalogProduct.title,
          titleUrdu: catalogProduct.title_urdu,
          description: catalogProduct.description,
          slug: catalogProduct.slug,
          categoryId: catalogProduct.category_id,
          storeId: data.storeId,
          isFirstParty: storeRow?.data?.seller_type === "FIRST_PARTY",
          isFeatured: false,
          isSponsored: false,
          pricePkr: data.pricePkr || 0,
          ratingAverage: 0,
          soldCount: 0,
          createdAt: catalogProduct.created_at,
        },
      });
    } catch (err: any) {
      logger.warn("⚠️ Typesense sync enqueue skipped:", err?.message);
    }

    return offer;
  }

  /**
   * Updates a seller's listing (catalog product + offer + stock).
   * The productId is the OFFER id (seller_offers.id) — the identifier the
   * seller portal sees in /api/seller/products. Ownership is enforced:
   * only the owning store's seller (or an admin) may update.
   */
  static async updateProduct(
    offerId: string,
    data: {
      title?: string;
      titleUrdu?: string;
      description?: string;
      pricePkr?: number;
      basePricePkr?: number;
      compareAtPricePkr?: number;
      categoryId?: string;
      categorySlug?: string;
      images?: string[];
      imageUrl?: string;
      stockQuantity?: number;
      weightKg?: number;
      isActive?: boolean;
    },
    user: { id: string; role: string },
  ) {
    const { data: offer } = await supabaseAdmin
      .from("seller_offers")
      .select("id, store_id, store:stores(owner_id), catalog_product:catalog_products(id, category_id)")
      .eq("id", offerId)
      .maybeSingle();

    if (!offer) throw new Error("Product not found");

    const isOwner = (offer.store as any)?.owner_id === user.id;
    const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
    if (!isOwner && !isAdmin) throw new Error("Not authorized to update this product");

    // Category change (id or slug resolved)
    let categoryId = data.categoryId;
    if (!categoryId && data.categorySlug) {
      const { data: cat } = await supabaseAdmin
        .from("categories")
        .select("id")
        .eq("slug", data.categorySlug)
        .maybeSingle();
      if (!cat) throw new Error(`Unknown category slug: ${data.categorySlug}`);
      categoryId = cat.id;
    }

    // Catalog product fields
    const catalogUpdate: Record<string, any> = {};
    if (data.title) catalogUpdate.title = data.title;
    if (data.titleUrdu !== undefined) catalogUpdate.title_urdu = data.titleUrdu;
    if (data.description) catalogUpdate.description = data.description;
    if (categoryId) catalogUpdate.category_id = categoryId;
    if (data.images && data.images.length > 0) {
      catalogUpdate.images = data.images;
      catalogUpdate.thumbnail = data.images[0];
    } else if (data.imageUrl) {
      catalogUpdate.images = [data.imageUrl];
      catalogUpdate.thumbnail = data.imageUrl;
    }
    if (data.isActive !== undefined) catalogUpdate.is_active = data.isActive;
    if (Object.keys(catalogUpdate).length > 0) {
      catalogUpdate.updated_at = new Date().toISOString();
      const { error } = await supabaseAdmin
        .from("catalog_products")
        .update(catalogUpdate)
        .eq("id", (offer.catalog_product as any).id);
      if (error) throw new Error(`Product update failed: ${error.message}`);
    }

    // Offer fields
    const offerUpdate: Record<string, any> = {};
    const price = data.pricePkr ?? data.basePricePkr;
    if (price !== undefined) offerUpdate.price_pkr = price;
    if (data.compareAtPricePkr !== undefined) offerUpdate.original_price_pkr = data.compareAtPricePkr;
    if (Object.keys(offerUpdate).length > 0) {
      offerUpdate.updated_at = new Date().toISOString();
      const { error } = await supabaseAdmin
        .from("seller_offers")
        .update(offerUpdate)
        .eq("id", offerId);
      if (error) throw new Error(`Offer update failed: ${error.message}`);
    }

    // Stock adjustment via the ledger (keeps snapshots consistent)
    if (data.stockQuantity !== undefined) {
      const { InventoryService } = await import("./inventory.service.js");
      const { data: variant } = await supabaseAdmin
        .from("offer_variants")
        .select("id")
        .eq("offer_id", offerId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (variant) {
        const { data: balance } = await supabaseAdmin
          .from("inventory_snapshots")
          .select("on_hand, reserved")
          .eq("offer_variant_id", variant.id)
          .maybeSingle();
        const current = balance?.on_hand ?? 0;
        const delta = data.stockQuantity - current;
        if (delta !== 0) {
          const { error: ledgerErr } = await supabaseAdmin
            .from("inventory_ledger")
            .insert({
              offer_variant_id: variant.id,
              store_id: offer.store_id,
              transaction_type: delta > 0 ? "RESTOCK" : "STOCK_ADJUST",
              quantity: delta,
              notes: "Manual stock adjustment via seller portal",
            });
          if (ledgerErr) throw new Error(`Stock update failed: ${ledgerErr.message}`);
        }
      }
    }

    // Re-sync search index
    try {
      const { JobQueueManager } = await import("../../jobs/queue.service.js");
      const { data: fresh } = await supabaseAdmin
        .from("seller_offers")
        .select("id, store_id, price_pkr, catalog_product:catalog_products(id, title, title_urdu, description, slug, category_id, is_active)")
        .eq("id", offerId)
        .maybeSingle();
      if (fresh) {
        await JobQueueManager.addJob("TYPESENSE_SYNC", {
          product: {
            id: (fresh.catalog_product as any).id,
            title: (fresh.catalog_product as any).title,
            titleUrdu: (fresh.catalog_product as any).title_urdu,
            description: (fresh.catalog_product as any).description,
            slug: (fresh.catalog_product as any).slug,
            categoryId: (fresh.catalog_product as any).category_id,
            storeId: fresh.store_id ?? offer.store_id,
            isFirstParty: false,
            isFeatured: false,
            isSponsored: false,
            pricePkr: fresh.price_pkr,
            ratingAverage: 0,
            soldCount: 0,
            createdAt: new Date().toISOString(),
          },
        });
      }
    } catch (err: any) {
      logger.warn("Typesense sync after update skipped:", err?.message);
    }

    return { success: true, offerId };
  }

  /**
   * Deactivates a seller's listing (soft delete: offer -> INACTIVE,
   * catalog product -> inactive). Orders, reviews and payouts referencing
   * the listing are preserved.
   */
  static async deleteProduct(
    offerId: string,
    user: { id: string; role: string },
  ) {
    const { data: offer } = await supabaseAdmin
      .from("seller_offers")
      .select("id, store_id, store:stores(owner_id), catalog_product:catalog_products(id)")
      .eq("id", offerId)
      .maybeSingle();

    if (!offer) throw new Error("Product not found");

    const isOwner = (offer.store as any)?.owner_id === user.id;
    const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
    if (!isOwner && !isAdmin) throw new Error("Not authorized to delete this product");

    const now = new Date().toISOString();
    const { error: offerErr } = await supabaseAdmin
      .from("seller_offers")
      .update({ status: "INACTIVE", updated_at: now })
      .eq("id", offerId);
    if (offerErr) throw new Error(`Delete failed: ${offerErr.message}`);

    await supabaseAdmin
      .from("catalog_products")
      .update({ is_active: false, updated_at: now })
      .eq("id", (offer.catalog_product as any).id);

    return { success: true, offerId };
  }

  // ── Badge computation ─────────────────────────────────────────────────────
  // Server-side badge logic: every product list/detail response includes a
  // `badges` array so the frontend renders consistently without re-deriving.

  private static _badgeConfigCache: {
    tier1: number;
    tier2: number;
    tier3: number;
    bestSellerDays: number;
    bestSellerLimit: number;
    newArrivalDays: number;
    expires: number;
  } | null = null;

  private static async _getBadgeConfig() {
    const now = Date.now();
    if (this._badgeConfigCache && now < this._badgeConfigCache.expires) {
      return this._badgeConfigCache;
    }
    const [t1, t2, t3, bsd, bsl, nad] = await Promise.all([
      ConfigService.getNumber("discount_tier_1_threshold", 30),
      ConfigService.getNumber("discount_tier_2_threshold", 40),
      ConfigService.getNumber("discount_tier_3_threshold", 45),
      ConfigService.getNumber("best_seller_days", 30),
      ConfigService.getNumber("best_seller_limit", 20),
      ConfigService.getNumber("new_arrival_days", 14),
    ]);
    this._badgeConfigCache = {
      tier1: t1, tier2: t2, tier3: t3,
      bestSellerDays: bsd, bestSellerLimit: bsl, newArrivalDays: nad,
      expires: now + 5 * 60 * 1000,
    };
    return this._badgeConfigCache;
  }

  private static _bestSellerCache: { ids: Set<string>; rank: Map<string, number>; expires: number } | null = null;

  private static async _getBestSellerIds(): Promise<{ ids: Set<string>; rank: Map<string, number> }> {
    const now = Date.now();
    if (this._bestSellerCache && now < this._bestSellerCache.expires) {
      return { ids: this._bestSellerCache.ids, rank: this._bestSellerCache.rank };
    }

    const cfg = await this._getBadgeConfig();
    const cacheKey = "badge:best-sellers";
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        const ids = new Set<string>(parsed.ids);
        const rank = new Map<string, number>(parsed.rank.map(([k, v]: [string, number]) => [k, v]));
        this._bestSellerCache = { ids, rank, expires: now + 5 * 60 * 1000 };
        return { ids, rank };
      }
    } catch { /* ignore cache miss */ }

    // Aggregate units sold per catalog product from delivered/completed orders
    const since = new Date();
    since.setDate(since.getDate() - cfg.bestSellerDays);

    const { data } = await supabaseAdmin.rpc("aggregate_product_sales", {
      since_date: since.toISOString(),
      result_limit: cfg.bestSellerLimit,
    });

    const ids = new Set<string>();
    const rank = new Map<string, number>();
    let r = 1;
    for (const row of data || []) {
      ids.add(row.product_id);
      rank.set(row.product_id, r++);
    }

    this._bestSellerCache = { ids, rank, expires: now + 5 * 60 * 1000 };
    try {
      await redis.set(cacheKey, JSON.stringify({
        ids: Array.from(ids),
        rank: Array.from(rank.entries()),
      }), { ex: 300 });
    } catch { /* ignore cache write */ }

    return { ids, rank };
  }

  /**
   * Computes the badge list for a single product. Max 2 badges per card.
   * Priority: new_arrival > best_seller > waw_deal.
   */
  static async computeBadges(
    productId: string,
    discountPercent: number,
    createdAt?: string,
  ): Promise<Array<{ type: string; tier?: number; label: string; position: "left" | "right" }>> {
    const cfg = await this._getBadgeConfig();
    const badges: Array<{ type: string; tier?: number; label: string; position: "left" | "right" }> = [];

    // New Arrival
    if (createdAt) {
      const created = new Date(createdAt).getTime();
      const cutoff = Date.now() - cfg.newArrivalDays * 24 * 60 * 60 * 1000;
      if (created >= cutoff) {
        badges.push({ type: "new_arrival", label: "NEW", position: "left" });
      }
    }

    // Best Seller
    const { ids, rank } = await this._getBestSellerIds();
    if (ids.has(productId)) {
      const r = rank.get(productId);
      badges.push({
        type: "best_seller",
        label: r && r <= 3 ? `#${r}` : "Best Seller",
        position: badges.length === 0 ? "left" : "right",
      });
    }

    // Waw Deal tiers
    if (discountPercent >= cfg.tier3) {
      badges.push({ type: "waw_deal", tier: 3, label: "MEGA DEAL", position: "right" });
    } else if (discountPercent >= cfg.tier2) {
      badges.push({ type: "waw_deal", tier: 2, label: "HOT DEAL", position: "right" });
    } else if (discountPercent >= cfg.tier1) {
      badges.push({ type: "waw_deal", tier: 1, label: "WAW DEAL", position: "right" });
    }

    // Cap at 2 badges, priority: new_arrival > best_seller > waw_deal
    if (badges.length > 2) {
      const priority = { new_arrival: 0, best_seller: 1, waw_deal: 2 };
      badges.sort((a, b) => priority[a.type as keyof typeof priority] - priority[b.type as keyof typeof priority]);
      return badges.slice(0, 2);
    }
    return badges;
  }

  /**
   * GET /api/products/best-sellers — top N products by units sold in the
   * configured rolling window. Returns standard product list shape.
   */
  static async getBestSellers(limit?: number): Promise<any[]> {
    const cfg = await this._getBadgeConfig();
    const n = limit || cfg.bestSellerLimit;

    const since = new Date();
    since.setDate(since.getDate() - cfg.bestSellerDays);

    const { data: sales } = await supabaseAdmin.rpc("aggregate_product_sales", {
      since_date: since.toISOString(),
      result_limit: n,
    });

    if (!sales || sales.length === 0) return [];

    // Fetch full product data for these IDs
    const productIds = (sales as any[]).map((s: any) => s.product_id);
    const { data: offers } = await supabaseAdmin
      .from("seller_offers")
      .select(`
        id, price_pkr, original_price_pkr, is_express, status,
        catalog_product:catalog_products!inner(id, title, title_urdu, slug, thumbnail, images, is_active, rating_average, rating_count, created_at),
        store:stores!inner(id, name, slug, city, rating_average, seller_type),
        variants:offer_variants(id, variant_name, price_adjustment_pkr)
      `)
      .in("catalog_product_id", productIds)
      .eq("status", "ACTIVE")
      .eq("catalog_product.is_active", true);

    if (!offers) return [];

    const { ids, rank } = await this._getBestSellerIds();
    const result: any[] = [];

    for (const offer of offers) {
      const cp: any = offer.catalog_product;
      const store: any = Array.isArray(offer.store) ? offer.store[0] : offer.store;
      if (!store || !cp) continue;
      const discountPercent = offer.original_price_pkr
        ? Math.round(((offer.original_price_pkr - offer.price_pkr) / offer.original_price_pkr) * 100)
        : 0;
      const badges = await this.computeBadges(cp.id, discountPercent, cp.created_at);
      result.push({
        id: offer.id,
        productId: cp.id,
        slug: cp.slug,
        title: cp.title,
        titleUrdu: cp.title_urdu,
        imageUrl: (Array.isArray(cp.images) && cp.images.length > 0) ? cp.images[0] : cp.thumbnail,
        pricePkr: offer.price_pkr,
        originalPricePkr: offer.original_price_pkr,
        discountPercent,
        storeId: store.id,
        storeName: store.name,
        storeSlug: store.slug,
        sellerCity: store.city,
        sellerType: store.seller_type,
        rating: cp.rating_average || store.rating_average,
        reviewsCount: cp.rating_count || 0,
        isExpress: offer.is_express,
        isFeaturedStore: false,
        badges,
        variants: offer.variants,
      });
    }

    // Sort by best seller rank
    result.sort((a, b) => (rank.get(a.productId) || 999) - (rank.get(b.productId) || 999));
    return result;
  }
}





