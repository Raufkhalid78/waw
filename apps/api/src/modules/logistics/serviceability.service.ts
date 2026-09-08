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

/**
 * Test seam: when set, all serviceability lookups resolve from this in-memory
 * matrix instead of hitting the database. This keeps the delivery-window test
 * deterministic and network-free in CI while production always uses Supabase.
 */
let testCityMatrix: Record<
  string,
  {
    city_name: string;
    province: string;
    tier: number;
    is_cod_eligible: boolean;
    is_active: boolean;
    supported_couriers: string[];
    intra_city_days_min: number;
    intra_city_days_max: number;
    inter_tier1_days_min: number;
    inter_tier1_days_max: number;
    inter_other_days_min: number;
    inter_other_days_max: number;
  }
> | null = null;

export const ServiceabilityTestSeam = {
  setCityMatrix(matrix: typeof testCityMatrix): void {
    testCityMatrix = matrix;
  },
  clear(): void {
    testCityMatrix = null;
  },
};

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

    let destRecord: any;
    let sellerTier: number;

    if (testCityMatrix) {
      const matrixEntry =
        testCityMatrix[normDestLower] ||
        Object.values(testCityMatrix).find(
          (c) => c.city_name.toLowerCase() === normDestLower,
        );
      destRecord = matrixEntry || null;
      const sellerEntry =
        testCityMatrix[normSeller] ||
        Object.values(testCityMatrix).find(
          (c) => c.city_name.toLowerCase() === normSeller,
        );
      sellerTier = sellerEntry?.tier || 2;
    } else {
      // Query destination city from database
      const { data: destDbRecord, error: destError } = await supabaseAdmin
        .from("serviceable_cities")
        .select("city_name, province, tier, is_cod_eligible, supported_couriers, is_active, intra_city_days_min, intra_city_days_max, inter_tier1_days_min, inter_tier1_days_max, inter_other_days_min, inter_other_days_max")
        .ilike("city_name", normDest)
        .maybeSingle();

      if (destError) {
        logger.warn("Failed to fetch destination city for serviceability check", { city: normDest, error: destError.message });
      }
      destRecord = destDbRecord;

      // Query seller city tier for delivery estimation
      const { data: sellerRecord } = await supabaseAdmin
        .from("serviceable_cities")
        .select("tier")
        .ilike("city_name", normSeller)
        .maybeSingle();
      sellerTier = sellerRecord?.tier || 2;
    }

    if (!destRecord || !destRecord.is_active) {
      throw new Error(`Delivery is currently not available to "${normDest}". Please select a supported city.`);
    }

    // COD Eligibility Restriction
    if (paymentMethod === PaymentMethod.COD && !destRecord.is_cod_eligible) {
      throw new Error(
        `Cash on Delivery (COD) is not available in ${destRecord.city_name}. Please choose an online payment method (Card or Raast QR).`,
      );
    }

    const destTier = destRecord.tier || 2;
    const isIntraCity = normSeller === destRecord.city_name.toLowerCase();

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
