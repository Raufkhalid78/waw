import { supabaseAdmin } from "../../config/supabase.js";
import { PaymentMethod } from "../../types/index.js";

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
  private static readonly TIER_1_CITIES = ["karachi", "lahore", "islamabad", "rawalpindi"];

  private static readonly FALLBACK_CITIES: Record<string, { province: string; isCodEligible: boolean; supportedCouriers: string[] }> = {
    "Lahore": { province: "Punjab", isCodEligible: true, supportedCouriers: ["POSTEX", "TRAX"] },
    "Karachi": { province: "Sindh", isCodEligible: true, supportedCouriers: ["POSTEX", "TRAX"] },
    "Islamabad": { province: "Federal", isCodEligible: true, supportedCouriers: ["POSTEX", "TRAX"] },
    "Rawalpindi": { province: "Punjab", isCodEligible: true, supportedCouriers: ["POSTEX", "TRAX"] },
    "Faisalabad": { province: "Punjab", isCodEligible: true, supportedCouriers: ["POSTEX", "TRAX"] },
    "Multan": { province: "Punjab", isCodEligible: true, supportedCouriers: ["POSTEX", "TRAX"] },
    "Peshawar": { province: "KPK", isCodEligible: true, supportedCouriers: ["POSTEX", "TRAX"] },
    "Quetta": { province: "Balochistan", isCodEligible: true, supportedCouriers: ["TRAX", "POSTEX"] },
    "Sialkot": { province: "Punjab", isCodEligible: true, supportedCouriers: ["POSTEX", "TRAX"] },
    "Gujranwala": { province: "Punjab", isCodEligible: true, supportedCouriers: ["POSTEX", "TRAX"] },
    "Hyderabad": { province: "Sindh", isCodEligible: true, supportedCouriers: ["POSTEX", "TRAX"] },
  };

  /**
   * Lists all active serviceable Pakistani cities with metadata.
   */
  static async listServiceableCities(): Promise<any[]> {
    try {
      const { data: cities, error } = await supabaseAdmin
        .from("serviceable_cities")
        .select("city_name, province, is_cod_eligible, supported_couriers, is_active")
        .eq("is_active", true)
        .order("city_name", { ascending: true });

      if (!error && cities && cities.length > 0) {
        return cities.map((c) => ({
          cityName: c.city_name,
          province: c.province,
          isCodEligible: c.is_cod_eligible,
          supportedCouriers: c.supported_couriers || ["POSTEX"],
        }));
      }
    } catch {}

    // Fallback if table not populated yet
    return Object.entries(this.FALLBACK_CITIES).map(([cityName, meta]) => ({
      cityName,
      province: meta.province,
      isCodEligible: meta.isCodEligible,
      supportedCouriers: meta.supportedCouriers,
    }));
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
    const normSeller = (sellerCity || "Lahore").trim().toLowerCase();
    const normDestLower = normDest.toLowerCase();

    let cityRecord: any = null;

    // 1. Fast in-memory registry check
    const match = Object.keys(this.FALLBACK_CITIES).find(
      (c) => c.toLowerCase() === normDestLower,
    );
    if (match) {
      const meta = this.FALLBACK_CITIES[match];
      cityRecord = {
        city_name: match,
        province: meta.province,
        is_cod_eligible: meta.isCodEligible,
        supported_couriers: meta.supportedCouriers,
        is_active: true,
      };
    } else {
      // 2. Query dynamic database table with fast timeout guard
      try {
        const queryPromise = supabaseAdmin
          .from("serviceable_cities")
          .select("city_name, province, is_cod_eligible, supported_couriers, is_active")
          .ilike("city_name", normDest)
          .maybeSingle();

        const timeoutPromise = new Promise<{ data: null; error: null }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: null }), 600)
        );

        const result: any = await Promise.race([queryPromise, timeoutPromise]);
        if (result?.data) {
          cityRecord = result.data;
        }
      } catch {}
    }

    if (!cityRecord || !cityRecord.is_active) {
      throw new Error(`Delivery is currently not available to "${normDest}". Please select a supported city.`);
    }

    // COD Eligibility Restriction
    if (paymentMethod === PaymentMethod.COD && !cityRecord.is_cod_eligible) {
      throw new Error(
        `Cash on Delivery (COD) is not available in ${cityRecord.city_name}. Please choose an online payment method (Card or Raast QR).`
      );
    }

    // Calculate Delivery Time Window
    const isIntraCity = normSeller === normDestLower;
    const isInterCityTier1 =
      this.TIER_1_CITIES.includes(normSeller) && this.TIER_1_CITIES.includes(normDestLower);

    let estimatedDays: DeliveryWindow;
    if (isIntraCity) {
      // Intra-city (e.g. Lahore seller to Lahore buyer): 2-3 business days
      estimatedDays = { min: 2, max: 3, label: "2–3 business days" };
    } else if (isInterCityTier1) {
      // Inter-city Tier 1 (e.g. Karachi to Lahore / Islamabad): 3–5 business days
      estimatedDays = { min: 3, max: 5, label: "3–5 business days" };
    } else {
      // Inter-city Other (e.g. Peshawar, Quetta, Multan, Faisalabad): 5-7 business days
      estimatedDays = { min: 5, max: 7, label: "5–7 business days" };
    }

    return {
      isServiceable: true,
      cityName: cityRecord.city_name,
      province: cityRecord.province,
      isCodEligible: Boolean(cityRecord.is_cod_eligible),
      estimatedDays,
      supportedCouriers: cityRecord.supported_couriers || ["POSTEX"],
    };
  }
}
