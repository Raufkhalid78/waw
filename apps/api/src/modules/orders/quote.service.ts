import jwt from "jsonwebtoken";
import { supabaseAdmin } from "../../config/supabase.js";
import { redis } from "../../config/redis.js";
import { ENV } from "../../config/env.js";
import {
  CheckoutQuoteRequest,
  CheckoutQuoteResponse,
  PaymentMethod,
  SellerType,
} from "../../types/index.js";

export class QuoteService {
  /**
   * Generates an authoritative, server-verified checkout quote.
   * Validates live inventory, seller commissions, delivery fees, and coupons.
   * Returns a 15-minute cryptographically signed quote token.
   */
  static async generateQuote(
    input: CheckoutQuoteRequest,
  ): Promise<CheckoutQuoteResponse> {
    if (!input.items || input.items.length === 0) {
      throw new Error("Cannot generate quote for empty cart");
    }

    const verifiedItems: any[] = [];
    let subtotalPkr = 0;

    // 1. Validate each item against live database
    for (const item of input.items) {
      const { data: product, error: prodErr } = await supabaseAdmin
        .from("products")
        .select(
          "id, title, base_price_pkr, is_active, store_id, is_first_party, stores(id, name, commission_rate_percentage)",
        )
        .or(`id.eq.${item.productId},slug.eq.${item.productId}`)
        .maybeSingle();

      if (prodErr || !product) {
        throw new Error(
          `Product not found or no longer available: ${item.productId}`,
        );
      }

      if (!product.is_active) {
        throw new Error(`Product is currently inactive: ${product.title}`);
      }

      let unitPrice = product.base_price_pkr;
      let stockAvailable = 100; // default product-level
      let variantSku: string | undefined;

      if (item.variantId) {
        const { data: variant, error: varErr } = await supabaseAdmin
          .from("product_variants")
          .select("id, sku, price_adjustment_pkr, stock_quantity, is_active")
          .eq("id", item.variantId)
          .eq("product_id", product.id)
          .maybeSingle();

        if (varErr || !variant || !variant.is_active) {
          throw new Error(
            `Variant selected is no longer available for ${product.title}`,
          );
        }

        if (variant.stock_quantity < item.quantity) {
          throw new Error(
            `Insufficient stock for ${product.title}. Only ${variant.stock_quantity} available.`,
          );
        }

        unitPrice += variant.price_adjustment_pkr || 0;
        stockAvailable = variant.stock_quantity;
        variantSku = variant.sku;
      }

      const itemTotal = unitPrice * item.quantity;
      subtotalPkr += itemTotal;

      verifiedItems.push({
        productId: product.id,
        variantId: item.variantId || null,
        variantSku,
        title: product.title,
        storeId: product.store_id || "waw_official_retail",
        storeName: (product.stores as any)?.name || "Waw Official Retail",
        commissionRatePercentage:
          (product.stores as any)?.commission_rate_percentage || 10,
        sellerType: product.is_first_party
          ? SellerType.FIRST_PARTY
          : SellerType.THIRD_PARTY,
        unitPricePkr: unitPrice,
        quantity: item.quantity,
        totalPricePkr: itemTotal,
      });
    }

    // 2. Delivery Fee Policy (Free Delivery >= PKR 5,000)
    const shippingFeePkr =
      subtotalPkr >= (ENV.FREE_DELIVERY_THRESHOLD_PKR || 5000) ? 0 : 200;

    // 3. COD Fee Policy (+PKR 100)
    const isCod = input.paymentMethod === PaymentMethod.COD;
    const codFeePkr = isCod ? ENV.DEFAULT_COD_FEE_PKR || 100 : 0;

    // 4. Coupon Calculation
    let couponDiscountPkr = 0;
    let appliedCoupon: any = null;

    if (input.couponCode) {
      const { data: coupon } = await supabaseAdmin
        .from("coupons")
        .select("*")
        .eq("code", input.couponCode.trim().toUpperCase())
        .eq("is_active", true)
        .single();

      if (coupon) {
        if (!coupon.expires_at || new Date(coupon.expires_at) >= new Date()) {
          if (!coupon.max_uses || coupon.current_uses < coupon.max_uses) {
            let eligibleTotal = subtotalPkr;
            if (coupon.store_id) {
              eligibleTotal = verifiedItems
                .filter((i) => i.storeId === coupon.store_id)
                .reduce((s, i) => s + i.totalPricePkr, 0);
            }

            if (eligibleTotal >= coupon.min_spend_pkr) {
              if (coupon.discount_type === "PERCENTAGE") {
                couponDiscountPkr = Math.round(
                  eligibleTotal * (coupon.discount_value / 100),
                );
                if (coupon.max_discount_pkr)
                  couponDiscountPkr = Math.min(
                    couponDiscountPkr,
                    coupon.max_discount_pkr,
                  );
              } else if (coupon.discount_type === "FIXED_PKR") {
                couponDiscountPkr = Math.min(
                  coupon.discount_value,
                  eligibleTotal,
                );
              } else if (coupon.discount_type === "FREE_SHIPPING") {
                couponDiscountPkr = shippingFeePkr;
              }
              appliedCoupon = { code: coupon.code, storeId: coupon.store_id };
            }
          }
        }
      }
    }

    const totalPkr = Math.max(
      0,
      subtotalPkr + shippingFeePkr + codFeePkr - couponDiscountPkr,
    );
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const quotePayload = {
      subtotalPkr,
      shippingFeePkr,
      codFeePkr,
      couponDiscountPkr,
      totalPkr,
      items: verifiedItems,
      shippingCity: input.shippingCity,
      paymentMethod: input.paymentMethod,
      appliedCoupon,
      expiresAt,
    };

    const quoteToken = jwt.sign(quotePayload, ENV.JWT_SECRET, {
      expiresIn: "15m",
    });

    // Cache in Redis with 15-min TTL
    await redis.set(
      `quote:${quoteToken.slice(-16)}`,
      JSON.stringify(quotePayload),
      "EX",
      900,
    );

    return {
      quoteToken,
      expiresAt,
      subtotalPkr,
      shippingFeePkr,
      codFeePkr,
      couponDiscountPkr,
      totalPkr,
      items: verifiedItems.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        title: i.title,
        storeId: i.storeId,
        unitPricePkr: i.unitPricePkr,
        quantity: i.quantity,
        totalPricePkr: i.totalPricePkr,
      })),
    };
  }

  /**
   * Verifies and unwraps a quote token before order placement.
   */
  static verifyQuoteToken(quoteToken: string): any {
    try {
      const decoded: any = jwt.verify(quoteToken, ENV.JWT_SECRET);
      if (new Date(decoded.expiresAt) < new Date()) {
        throw new Error(
          "Checkout quote has expired. Please refresh your cart.",
        );
      }
      return decoded;
    } catch (err: any) {
      throw new Error(`Invalid or expired checkout quote: ${err.message}`);
    }
  }
}
