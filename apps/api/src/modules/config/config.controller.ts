import { Request, Response } from "express";
import { supabaseAdmin } from "../../config/supabase.js";

export class ConfigController {
  /**
   * GET /api/config/hero-banners
   * Public: active homepage hero banners, newest window first. Falls back
   * gracefully to an empty list — the storefront renders its static slides
   * when the CMS has no banners yet.
   */
  static async getHeroBanners(_req: Request, res: Response): Promise<void> {
    try {
      const { data, error } = await supabaseAdmin
        .from("campaigns")
        .select("id, title, subtitle, image_url, link_url, tag, position, sort_order")
        .eq("is_active", true)
        .eq("position", "homepage")
        .lte("starts_at", new Date().toISOString())
        .or(`ends_at.is.null,ends_at.gte.${new Date().toISOString()}`)
        .order("sort_order", { ascending: true })
        .limit(6);

      if (error) throw error;

      res.json({
        banners: (data || []).map((b: any) => ({
          id: b.id,
          badge: b.tag,
          title: b.title,
          description: b.subtitle,
          imageUrl: b.image_url,
          href: b.link_url || "/",
        })),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getStorefrontConfig(req: Request, res: Response): Promise<void> {
    try {
      const [citiesRes, searchesRes, campaignsRes] = await Promise.all([
        supabaseAdmin.from('serviceable_cities').select('city_name').eq('is_active', true).order('city_name'),
        supabaseAdmin.from('search_suggestions').select('term').eq('is_active', true).order('score', { ascending: false }).limit(10),
        supabaseAdmin.from('campaigns').select('*').eq('is_active', true).eq('campaign_type', 'PROMO_STRIP').order('sort_order', { ascending: true })
      ]);

      if (citiesRes.error) throw citiesRes.error;
      if (searchesRes.error) throw searchesRes.error;
      if (campaignsRes.error) throw campaignsRes.error;

      const config = {
        cities: citiesRes.data.map((c: any) => c.city_name),
        popularSearches: searchesRes.data.map((s: any) => s.term),
        promotionalAnnouncements: campaignsRes.data.map((c: any) => ({
          id: c.id,
          tag: c.tag,
          text: c.title,
          link: c.link_url,
          linkText: c.link_text
        }))
      };
      
      res.json(config);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
