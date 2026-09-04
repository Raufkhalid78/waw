import { Request, Response } from "express";
import { supabaseAdmin } from "../../config/supabase.js";

export class StoreController {
  static async listStores(req: Request, res: Response): Promise<void> {
    try {
      const { data: stores, error } = await supabaseAdmin
        .from("stores")
        .select("id, name, slug, description, logo_url, banner_url, seller_type, status, city, address, rating_average, rating_count, is_verified, created_at")
        .eq("status", "ACTIVE")
        .order("rating_count", { ascending: false })
        .limit(20);

      if (error) throw error;

      const storeIds = (stores || []).map((s: any) => s.id);
      if (storeIds.length === 0) {
        res.json([]);
        return;
      }

      const { data: offers } = await supabaseAdmin
        .from("seller_offers")
        .select("store_id, id, price_pkr, catalog_product:catalog_products(title, slug, images, is_active)")
        .in("store_id", storeIds)
        .eq("status", "ACTIVE")
        .eq("is_active", true);

      const storeOfferMap: Record<string, any[]> = {};
      for (const offer of offers || []) {
        if (!storeOfferMap[offer.store_id]) storeOfferMap[offer.store_id] = [];
        storeOfferMap[offer.store_id].push(offer);
      }

      const result = (stores || []).map((store: any) => {
        const storeOffers = storeOfferMap[store.id] || [];
        const topProducts = storeOffers.slice(0, 3).map((o: any) => ({
          title: o.catalog_product?.title || "Product",
          pricePkr: o.price_pkr,
          imageUrl: o.catalog_product?.images?.[0] || "",
        }));
        return {
          ...store,
          productCount: storeOffers.length,
          topProducts,
        };
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getStoreBySlug(req: Request, res: Response): Promise<void> {
    try {
      const { data: store, error } = await supabaseAdmin
        .from("stores")
        .select("id, name, slug, description, logo_url, seller_type, status, city, rating_average, rating_count, created_at")
        .eq("slug", req.params.slug)
        .eq("status", "ACTIVE")
        .single();

      if (error || !store) {
        res.status(404).json({ error: "Store not found or not active" });
        return;
      }
      res.json(store);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
