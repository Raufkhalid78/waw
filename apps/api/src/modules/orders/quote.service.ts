import jwt from "jsonwebtoken";
import { supabaseAdmin } from "../../config/supabase.js";
import { redis } from "../../config/redis.js";
import { ENV } from "../../config/env.js";
import { ServiceabilityService } from "../logistics/serviceability.service.js";
import {
  CheckoutQuoteRequest,
  CheckoutQuoteResponse,
  PaymentMethod,
  SellerType,
} from "../../types/index.js";

export class QuoteService {
  static async generateQuote(
    input: CheckoutQuoteRequest,
  ): Promise<CheckoutQuoteResponse> {
    if (!input.items || input.items.length === 0) {
      throw new Error("Cannot generate quote for empty cart");
    }

    // 1. Authoritative Destination Serviceability & COD Eligibility Check
    let serviceabilityMeta: any = null;
    if (input.shippingCity) {
      serviceabilityMeta = await ServiceabilityService.checkDestination(
        input.shippingCity,
        undefined,
        input.paymentMethod,
      );
    }

    const verifiedItems: any[] = [];
    let subtotalPkr = 0;

    // 2. Validate against canonical schema (seller_offers, catalog_products, inventory_ledger)
    for (const item of input.items) {
      // Find offer by slug, offer id, or catalog product id
      const { data: offer, error: offerErr } = await supabaseAdmin
        .from("seller_offers")
        .select(`
          id, price_pkr, status, store_id, is_express,
          catalog_product:catalog_products!inner(id, title, slug, is_active),
          store:stores!inner(id, name, city, commission_rate_percentage)
        `)
        .or(`id.eq.${item.productId},catalog_product_id.eq.${item.productId},catalog_product.slug.eq.${item.productId}`)
        .eq("status", "ACTIVE")
        .maybeSingle();

      const offerData: any = offer;
      if (offerErr || !offerData || !offerData.catalog_product?.is_active) {
        throw new Error(`Product not found or unavailable: ${item.productId}`);
      }

      let unitPrice = offerData.price_pkr;
      let stockAvailable = 0;
      let variantName = "Default";
      let offerVariantId = null;

      // Find variant
      let variantQuery = supabaseAdmin
        .from("offer_variants")
        .select("id, variant_name, price_adjustment_pkr")
        .eq("offer_id", offerData.id);

      if (item.variantId) {
        variantQuery = variantQuery.eq("id", item.variantId);
      }
      const { data: variants } = await variantQuery;

      if (!variants || variants.length === 0) {
        throw new Error(`Variant not found for product ${offerData.catalog_product.title}`);
      }
      const variant = variants[0];
      offerVariantId = variant.id;
      variantName = variant.variant_name;
      unitPrice += variant.price_adjustment_pkr || 0;

      // Check stock via inventory_ledger sum
      const { data: invData } = await supabaseAdmin
        .from("inventory_ledger")
        .select("quantity")
        .eq("offer_variant_id", variant.id);

      stockAvailable = (invData || []).reduce((sum: number, row: any) => sum + (row.quantity || 0), 0);

      if (stockAvailable < item.quantity) {
        throw new Error(`Insufficient stock for ${offerData.catalog_product.title}. Only ${stockAvailable} available.`);
      }

      const itemTotal = unitPrice * item.quantity;
      subtotalPkr += itemTotal;

      verifiedItems.push({
        productId: item.productId,
        variantId: offerVariantId,
        variantName: variantName,
        title: offerData.catalog_product.title,
        storeId: offerData.store_id,
        storeName: offerData.store.name,
        sellerCity: offerData.store.city,
        commissionRatePercentage: offerData.store.commission_rate_percentage || 10,
        sellerType: SellerType.THIRD_PARTY,
        unitPricePkr: unitPrice,
        quantity: item.quantity,
        totalPricePkr: itemTotal,
      });
    }

    // 3. Delivery Fee Policy (Free Delivery >= PKR 5,000)
    const shippingFeePkr = subtotalPkr >= (ENV.FREE_DELIVERY_THRESHOLD_PKR || 5000) ? 0 : 200;

    // 4. COD Fee Policy (+PKR 100)
    const isCod = input.paymentMethod === PaymentMethod.COD;
    const codFeePkr = isCod ? (ENV.DEFAULT_COD_FEE_PKR || 100) : 0;

    const couponDiscountPkr = 0;
    const appliedCoupon = undefined;
    const totalPkr = subtotalPkr + shippingFeePkr + codFeePkr - couponDiscountPkr;

    // 5. Generate secure quote token
    const tokenPayload = {
      items: verifiedItems,
      subtotalPkr,
      shippingFeePkr,
      codFeePkr,
      couponDiscountPkr,
      totalPkr,
      appliedCoupon,
      shippingCity: input.shippingCity,
      estimatedDeliveryDays: serviceabilityMeta?.estimatedDays || { min: 2, max: 5, label: "2–5 business days" },
      paymentMethod: input.paymentMethod,
      timestamp: Date.now(),
    };

    const quoteToken = jwt.sign(tokenPayload, ENV.JWT_SECRET || "waw-fallback-secret-2026", { expiresIn: "15m" });

    return {
      quoteToken,
      subtotalPkr,
      shippingFeePkr,
      codFeePkr,
      couponDiscountPkr,
      totalPkr,
      items: verifiedItems,
      estimatedDeliveryDays: serviceabilityMeta?.estimatedDays,
      expiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
    };
  }

  static verifyQuoteToken(token: string): any {
    try {
      return jwt.verify(token, ENV.JWT_SECRET || 'waw-fallback-secret-2026');
    } catch (err: any) {
      if (err.name === "TokenExpiredError") {
        throw new Error("Checkout session expired. Please refresh your cart.");
      }
      throw new Error("Invalid checkout session. Please start over.");
    }
  }
}
