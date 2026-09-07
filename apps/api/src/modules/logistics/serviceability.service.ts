import { supabaseAdmin } from "../../config/supabase.js";
import { PaymentMethod } from "../../types/index.js";
import { logger } from "../../config/logger.js";
import { ConfigService } from "../admin/config.service.js";

export interface DeliveryWindow {
  min: number;
  max: number;
  label: string;
}

export interface ServiceabilityResult {
  isServiceable: boolean;
  cityName: string;
  province: string;
  isCodEligible: boolean;
  estimatedDays: DeliveryWindow;
  supportedCouriers: string[];
}

export class ServiceabilityService {
  /**
   * Lists all active serviceable Pakistani cities with metadata.
   */
  static async listServiceableCities(): Promise<any[]> {
    const { data: cities, error } = await supabaseAdmin
      .from("serviceable_cities")
      .select("city_name, province, tier, is_cod_eligible, supported_couriers, is_active")
      .eq("is_active", true)
      .order("city_name", { ascending: true });

    if (error) throw new Error(`Failed to fetch serviceable cities: ${error.message}`);

    return (cities || []).map((c) => ({
      cityName: c.city_name,
      province: c.province,
      tier: c.tier,
      isCodEligible: c.is_cod_eligible,
      supportedCouriers: c.supported_couriers || ["POSTEX"],
    }));
  }

  /**
   * Fetches tier-1 cities from the database.
   */
  static async getTier1Cities(): Promise<string[]> {
    const { data, error } = await supabaseAdmin
      .from("serviceable_cities")
      .select("city_name")
      .eq("tier", 1)
      .eq("is_active", true);

    if (error) {
      logger.warn("Failed to fetch tier-1 cities from DB", { error: error.message });
      return [];
    }

    return (data || []).map((c: any) => c.city_name.toLowerCase());
  }

  /**
   * Authoritatively checks destination serviceability, computes delivery ETA,
   * and enforces COD availability.
   */
  static async checkDestination(
    destinationCity?: string,
    sellerCity?: string,
    paymentMethod?: PaymentMethod,
  ): Promise<ServiceabilityResult> {
    if (!destinationCity || !destinationCity.trim()) {
      throw new Error("Shipping destination city is required");
    }

    const normDest = destinationCity.trim();
    const defaultCity = await ConfigService.get("default_city");
    const normSeller = (sellerCity || defaultCity || "Lahore").trim().toLowerCase();
    const normDestLower = normDest.toLowerCase();

    // Query destination city from database
    const { data: destRecord, error: destError } = await supabaseAdmin
      .from("serviceable_cities")
      .select("city_name, province, tier, is_cod_eligible, supported_couriers, is_active, intra_city_days_min, intra_city_days_max, inter_tier1_days_min, inter_tier1_days_max, inter_other_days_min, inter_other_days_max")
      .ilike("city_name", normDest)
      .maybeSingle();

    if (destError) {
      logger.warn("Failed to fetch destination city for serviceability check", { city: normDest, error: destError.message });
    }

    if (!destRecord || !destRecord.is_active) {
      throw new Error(`Delivery is currently not available to "${normDest}". Please select a supported city.`);
    }

    // COD Eligibility Restriction
    if (paymentMethod === PaymentMethod.COD && !destRecord.is_cod_eligible) {
      throw new Error(
        `Cash on Delivery (COD) is not available in ${destRecord.city_name}. Please choose an online payment method (Card or Raast QR).`
      );
    }

    // Query seller city tier for delivery estimation
    const { data: sellerRecord } = await supabaseAdmin
      .from("serviceable_cities")
      .select("tier")
      .ilike("city_name", normSeller)
      .maybeSingle();

    const sellerTier = sellerRecord?.tier || 2;
    const destTier = destRecord.tier || 2;
    const isIntraCity = normSeller === normDestLower;

    // Calculate Delivery Time Window from DB columns
    let estimatedDays: DeliveryWindow;
    if (isIntraCity) {
      const min = destRecord.intra_city_days_min ?? 2;
      const max = destRecord.intra_city_days_max ?? 3;
      estimatedDays = { min, max, label: `${min}–${max} business days` };
    } else if (sellerTier === 1 && destTier === 1) {
      const min = destRecord.inter_tier1_days_min ?? 3;
      const max = destRecord.inter_tier1_days_max ?? 5;
      estimatedDays = { min, max, label: `${min}–${max} business days` };
    } else {
      const min = destRecord.inter_other_days_min ?? 5;
      const max = destRecord.inter_other_days_max ?? 7;
      estimatedDays = { min, max, label: `${min}–${max} business days` };
    }

    return {
      isServiceable: true,
      cityName: destRecord.city_name,
      province: destRecord.province,
      isCodEligible: Boolean(destRecord.is_cod_eligible),
      estimatedDays,
      supportedCouriers: destRecord.supported_couriers || ["POSTEX"],
    };
  }
}
