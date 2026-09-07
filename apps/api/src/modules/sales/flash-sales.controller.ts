import { Request, Response } from "express";
import { supabaseAdmin } from "../../config/supabase.js";
import { logger } from "../../config/logger.js";

/**
 * GET /api/flash-sales/active
 *
 * Public endpoint. Returns the currently-running flash sale (is_active,
 * start_time <= now, end_time > now) with its items joined to offer variants
 * and catalog product info so the storefront can render deal cards directly.
 */
export async function getActiveFlashSale(_req: Request, res: Response) {
  try {
    const now = new Date().toISOString();

    // 1. Find the running sale
    const { data: sale, error: saleError } = await supabaseAdmin
      .from("flash_sales")
      .select("id, title, title_urdu, banner_url, start_time, end_time")
      .eq("is_active", true)
      .lte("start_time", now)
      .gte("end_time", now)
      .order("end_time", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (saleError) {
      logger.warn("Flash sale query failed", { error: saleError.message });
      return res.json({ flashSale: null });
    }

    if (!sale) {
      return res.json({ flashSale: null });
    }

    // 2. Fetch items with remaining stock > 0, joined to variant -> offer -> product
    const { data: items, error: itemsError } = await supabaseAdmin
      .from("flash_sale_items")
      .select(`
        id, promotional_price_pkr, allocated_stock, sold_count,
        variant:offer_variants(
          id, variant_name, price_adjustment_pkr,
          seller_offer:seller_offers(
            id, price_pkr, original_price_pkr,
            catalog_product(id, title, title_urdu, slug, thumbnail, images)
          )
        )
      `)
      .eq("flash_sale_id", sale.id)
      .order("promotional_price_pkr", { ascending: true });

    if (itemsError) {
      logger.warn("Flash sale items query failed", { error: itemsError.message });
      return res.json({ flashSale: { ...sale, items: [] } });
    }

    // Filter items with remaining stock and valid joins, shape for the client
    const shapedItems = (items || [])
      .map((it: any) => {
        const variant = Array.isArray(it.variant) ? it.variant[0] : it.variant;
        const offer = variant?.seller_offer
          ? (Array.isArray(variant.seller_offer) ? variant.seller_offer[0] : variant.seller_offer)
          : null;
        const product = offer?.catalog_product
          ? (Array.isArray(offer.catalog_product) ? offer.catalog_product[0] : offer.catalog_product)
          : null;

        if (!product) return null;

        const remaining = Math.max(0, (it.allocated_stock || 0) - (it.sold_count || 0));
        if (remaining <= 0) return null;

        const basePrice = offer?.original_price_pkr || offer?.price_pkr || 0;
        const discountPercent = basePrice > 0
          ? Math.round(((basePrice - it.promotional_price_pkr) / basePrice) * 100)
          : 0;

        return {
          itemId: it.id,
          variantId: variant?.id,
          variantName: variant?.variant_name,
          productId: product.id,
          title: product.title,
          titleUrdu: product.title_urdu,
          slug: product.slug,
          imageUrl: product.thumbnail || (product.images?.[0] ?? null),
          regularPricePkr: basePrice,
          salePricePkr: it.promotional_price_pkr,
          discountPercent,
          remainingStock: remaining,
        };
      })
      .filter(Boolean);

    res.json({
      flashSale: {
        id: sale.id,
        title: sale.title,
        titleUrdu: sale.title_urdu,
        bannerUrl: sale.banner_url,
        startTime: sale.start_time,
        endTime: sale.end_time,
        items: shapedItems,
      },
    });
  } catch (err: any) {
    logger.warn("Flash sale endpoint error", { error: err.message });
    // Public endpoint — never fail the homepage: return null sale
    res.json({ flashSale: null });
  }
}
