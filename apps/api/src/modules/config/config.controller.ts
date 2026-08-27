import { Request, Response } from "express";
import { supabaseAdmin } from "../../config/supabase.js";

export class ConfigController {
  static async getStorefrontConfig(req: Request, res: Response): Promise<void> {
    try {
      const [citiesRes, searchesRes, campaignsRes] = await Promise.all([
        supabaseAdmin.from('serviceability_locations').select('city_name').eq('is_active', true).order('city_name'),
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
