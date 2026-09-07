import { Request, Response } from "express";
import { supabaseAdmin } from "../../config/supabase.js";

/**
 * GET /api/cities — Returns all active serviceable cities with tier info.
 * No auth required. Used by frontend dropdowns.
 */
export async function getCities(_req: Request, res: Response) {
  try {
    const { data: cities, error } = await supabaseAdmin
      .from("serviceable_cities")
      .select("city_name, province, tier, is_cod_eligible, supported_couriers")
      .eq("is_active", true)
      .order("tier", { ascending: true })
      .order("city_name", { ascending: true });

    if (error) {
      return res.status(500).json({ error: "Failed to fetch cities" });
    }

    res.json({
      cities: (cities || []).map((c) => ({
        name: c.city_name,
        province: c.province,
        tier: c.tier,
        isCodEligible: c.is_cod_eligible,
        supportedCouriers: c.supported_couriers || ["POSTEX"],
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
