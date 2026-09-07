import { Request, Response } from "express";
import { ConfigService } from "../admin/config.service.js";

/**
 * GET /api/marketplace-config — Returns all marketplace settings for frontend.
 * No auth required. Cached in memory for 5 minutes.
 */
export async function getMarketplaceConfig(_req: Request, res: Response) {
  try {
    const config = await ConfigService.getAll();

    res.json({
      // Delivery & Shipping
      freeDeliveryThresholdPkr: config.free_delivery_threshold_pkr ?? 5000,
      defaultShippingFeePkr: config.default_shipping_fee_pkr ?? 200,
      codHandlingFeePkr: config.cod_handling_fee_pkr ?? 100,
      gstRatePercentage: config.gst_rate_percentage ?? 18,
      returnWindowDays: config.return_window_days ?? 7,
      payoutSettlementDays: config.payout_settlement_days ?? 7,
      dispatchWindowHours: config.dispatch_window_hours ?? 24,
      heavyParcelWeightKg: config.heavy_parcel_weight_kg ?? 5,

      // Contact (String() — config values may be stored/typed numerically;
      // phone numbers must always serialize as strings)
      whatsappNumber: String(config.whatsapp_number ?? "+923001234567"),
      supportEmail: String(config.support_email ?? "support@waw.pk"),
      careEmail: String(config.care_email ?? "care@waw.com.pk"),
      supportPhone: String(config.support_phone ?? "+92 300 1234567"),

      // URLs
      siteUrl: config.site_url ?? "https://waw.com.pk",
      siteUrlWww: config.site_url_www ?? "https://www.waw.com.pk",
      adminUrl: config.admin_url ?? "https://admin.waw.com.pk",
      sellerUrl: config.seller_url ?? "https://seller.waw.com.pk",
      facebookUrl: config.facebook_url ?? "#",
      twitterUrl: config.twitter_url ?? "#",
      instagramUrl: config.instagram_url ?? "#",
      linkedinUrl: config.linkedin_url ?? "#",
      youtubeUrl: config.youtube_url ?? "#",

      // Business
      businessName: config.business_name ?? "Waw Pakistan",
      businessNameUrdu: config.business_name_urdu ?? "واو پاکستان",
      businessTagline: config.business_tagline ?? "Pakistan's premium online marketplace",
      businessCity: config.business_city ?? "Lahore",
      businessCountry: config.business_country ?? "Pakistan",
      currency: config.currency ?? "PKR",
      currencySymbol: config.currency_symbol ?? "Rs",
      defaultCommissionPct: config.default_commission_pct ?? 10,

      // Raast
      raastMerchantAlias: config.raast_merchant_alias ?? "",
      raastMerchantName: config.raast_merchant_name ?? "",
      raastMerchantCity: config.raast_merchant_city ?? "Lahore",

      // Default
      defaultCity: config.default_city ?? "Lahore",

      // Badges
      badgeTier1Threshold: config.discount_tier_1_threshold ?? 30,
      badgeTier2Threshold: config.discount_tier_2_threshold ?? 40,
      badgeTier3Threshold: config.discount_tier_3_threshold ?? 45,
      bestSellerDays: config.best_seller_days ?? 30,
      bestSellerLimit: config.best_seller_limit ?? 20,
      newArrivalDays: config.new_arrival_days ?? 14,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
