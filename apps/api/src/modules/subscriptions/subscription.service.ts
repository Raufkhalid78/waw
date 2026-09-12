import { supabaseAdmin } from "../../config/supabase.js";
import { logger } from "../../config/logger.js";

export interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  price_pkr: number;
  billing_cycle: string;
  max_products: number;
  max_images_per_product: number;
  ai_descriptions: boolean;
  advanced_analytics: boolean;
  priority_support: boolean;
  api_access: boolean;
  featured_store: boolean;
  commission_reduction: number;
}

export class SubscriptionService {
  /**
   * Get all active plans
   */
  static async getPlans(): Promise<SubscriptionPlan[]> {
    const { data, error } = await supabaseAdmin
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true)
      .order("price_pkr", { ascending: true });

    if (error) throw error;
    return (data || []) as SubscriptionPlan[];
  }

  /**
   * Get store's current subscription
   */
  static async getStoreSubscription(storeId: string) {
    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("subscription_plan, subscription_active, subscription_expires_at")
      .eq("id", storeId)
      .single();

    const { data: subscription } = await supabaseAdmin
      .from("seller_subscriptions")
      .select("*, plan:subscription_plans(*)")
      .eq("store_id", storeId)
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    return {
      store: store || {},
      subscription: subscription || null,
    };
  }

  /**
   * Check if store has access to a feature
   */
  static async hasFeature(storeId: string, feature: string): Promise<boolean> {
    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("subscription_plan, subscription_active")
      .eq("id", storeId)
      .single();

    if (!store || !store.subscription_active) return false;

    const plan = store.subscription_plan || "free";

    const featureMap: Record<string, string[]> = {
      ai_descriptions: ["pro", "enterprise"],
      advanced_analytics: ["pro", "enterprise"],
      priority_support: ["pro", "enterprise"],
      api_access: ["enterprise"],
      featured_store: ["enterprise"],
    };

    return featureMap[feature]?.includes(plan) || false;
  }

  /**
   * Get product limit for store's plan
   */
  static async getProductLimit(storeId: string): Promise<number> {
    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("subscription_plan, subscription_active")
      .eq("id", storeId)
      .single();

    if (!store || !store.subscription_active) return 10; // Free tier default

    const { data: plan } = await supabaseAdmin
      .from("subscription_plans")
      .select("max_products")
      .eq("name", store.subscription_plan || "free")
      .single();

    return plan?.max_products || 10;
  }

  /**
   * Subscribe store to a plan
   */
  static async subscribe(storeId: string, planName: string, paymentReference?: string) {
    // Get plan
    const { data: plan } = await supabaseAdmin
      .from("subscription_plans")
      .select("*")
      .eq("name", planName)
      .eq("is_active", true)
      .single();

    if (!plan) throw new Error("Invalid plan");

    // Cancel existing active subscription
    await supabaseAdmin
      .from("seller_subscriptions")
      .update({ status: "CANCELLED", cancelled_at: new Date().toISOString() })
      .eq("store_id", storeId)
      .eq("status", "ACTIVE");

    // Calculate expiry (1 month from now)
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    // Create new subscription
    const { data: subscription, error } = await supabaseAdmin
      .from("seller_subscriptions")
      .insert({
        store_id: storeId,
        plan_id: plan.id,
        status: plan.price_pkr === 0 ? "ACTIVE" : "PENDING",
        expires_at: expiresAt.toISOString(),
        payment_reference: paymentReference || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Update store
    await supabaseAdmin
      .from("stores")
      .update({
        subscription_plan: planName,
        subscription_active: plan.price_pkr === 0, // Free is active immediately
        subscription_expires_at: expiresAt.toISOString(),
      })
      .eq("id", storeId);

    logger.info("Store subscribed", { storeId, plan: planName });
    return subscription;
  }

  /**
   * Cancel subscription
   */
  static async cancel(storeId: string) {
    const { error } = await supabaseAdmin
      .from("seller_subscriptions")
      .update({ status: "CANCELLED", cancelled_at: new Date().toISOString() })
      .eq("store_id", storeId)
      .eq("status", "ACTIVE");

    if (error) throw error;

    // Downgrade to free
    await supabaseAdmin
      .from("stores")
      .update({
        subscription_plan: "free",
        subscription_active: true,
        subscription_expires_at: null,
      })
      .eq("id", storeId);

    logger.info("Store subscription cancelled", { storeId });
  }

  /**
   * Check and enforce product limits
   */
  static async canAddProduct(storeId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
    const limit = await this.getProductLimit(storeId);

    const { count } = await supabaseAdmin
      .from("seller_offers")
      .select("*", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("is_active", true);

    const current = count || 0;
    return {
      allowed: current < limit,
      current,
      limit,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Payment flow: paid plans move PENDING → ACTIVE only after the APG
  // payment settlement confirms the subscription charge.
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Initiate payment for a paid plan. Returns a Bank Alfalah APG card
   * checkout (hosted page) the seller completes in-browser; the settlement
   * verification then activates the subscription.
   */
  static async initiateSubscriptionPayment(storeId: string, planName: string) {
    const { data: plan } = await supabaseAdmin
      .from("subscription_plans")
      .select("*")
      .eq("name", planName)
      .eq("is_active", true)
      .single();

    if (!plan) throw new Error("Invalid plan");
    if (plan.price_pkr === 0) throw new Error("Free plan does not require payment");

    // Ensure a PENDING subscription row exists to attach the payment to
    await this.subscribe(storeId, planName);

    // Create an APG card-checkout intent using the store's owner as payer.
    // Subscription payments are tracked with a synthetic order reference so
    // the existing ledger machinery can match them.
    const { AlfaPaymentGatewayService } = await import("../payments/apg.service.js");
    const { ENV } = await import("../../config/env.js");
    const { randomUUID } = await import("crypto");

    const paymentRef = `sub_${storeId.slice(0, 8)}_${randomUUID()}`;

    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("name")
      .eq("id", storeId)
      .single();

    // APG card checkout requires a real order row — subscription charges
    // use a synthetic payment reference recorded as a payments row.
    const { data: owner } = await supabaseAdmin
      .from("stores")
      .select("owner_id")
      .eq("id", storeId)
      .single();

    const checkout = await AlfaPaymentGatewayService.createSubscriptionCardCheckout({
      amountPkr: plan.price_pkr,
      paymentReference: paymentRef,
      description: `Waw ${plan.display_name} subscription — ${store?.name || "Store"}`,
      buyerEmail: `store-${storeId.slice(0, 8)}@sellers.waw.com.pk`,
      buyerPhone: "",
      returnUrl: `${ENV.SELLER_PORTAL_URL || "https://seller.waw.com.pk"}/subscription?status=verifying&ref=${encodeURIComponent(paymentRef)}`,
    });

    return {
      checkoutUrl: checkout.redirectUrl,
      postUrl: checkout.postUrl,
      fields: checkout.fields,
      paymentReference: paymentRef,
      planName,
      amountPkr: plan.price_pkr,
    };
  }

  /**
   * Activates a PENDING subscription after payment confirmation.
   * Called by the payment webhook (or admin override).
   */
  static async activatePendingSubscription(paymentReference: string) {
    if (!paymentReference?.startsWith("sub_")) return false;

    const storeIdPart = paymentReference.slice(4, 12);
    const { data: pending } = await supabaseAdmin
      .from("seller_subscriptions")
      .select("id, store_id, plan_id")
      .eq("payment_reference", paymentReference)
      .eq("status", "PENDING")
      .maybeSingle();

    if (!pending) return false;

    const { data: plan } = await supabaseAdmin
      .from("subscription_plans")
      .select("name")
      .eq("id", pending.plan_id)
      .single();

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const { error } = await supabaseAdmin
      .from("seller_subscriptions")
      .update({
        status: "ACTIVE",
        payment_reference: paymentReference,
        expires_at: expiresAt.toISOString(),
      })
      .eq("id", pending.id);

    if (error) throw error;

    await supabaseAdmin
      .from("stores")
      .update({
        subscription_plan: plan?.name || "pro",
        subscription_active: true,
        subscription_expires_at: expiresAt.toISOString(),
      })
      .eq("id", pending.store_id);

    logger.info("Subscription activated after payment", {
      paymentReference,
      storeId: pending.store_id,
    });
    return true;
  }

  /**
   * Admin: manually activate/extend a store's subscription (e.g. after
   * bank transfer). Overrides payment flow.
   */
  static async adminActivateSubscription(storeId: string, months = 1) {
    const { data: current } = await supabaseAdmin
      .from("seller_subscriptions")
      .select("id, plan_id, expires_at")
      .eq("store_id", storeId)
      .in("status", ["PENDING", "ACTIVE"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let planName = "pro";
    if (current) {
      const { data: plan } = await supabaseAdmin
        .from("subscription_plans")
        .select("name")
        .eq("id", current.plan_id)
        .single();
      planName = plan?.name || "pro";
    }

    const expiresAt = new Date();
    if (current?.expires_at && new Date(current.expires_at) > new Date()) {
      // Extend from existing expiry
      expiresAt.setTime(new Date(current.expires_at).getTime());
    }
    expiresAt.setMonth(expiresAt.getMonth() + months);

    if (current) {
      await supabaseAdmin
        .from("seller_subscriptions")
        .update({ status: "ACTIVE", expires_at: expiresAt.toISOString() })
        .eq("id", current.id);
    }

    await supabaseAdmin
      .from("stores")
      .update({
        subscription_plan: planName,
        subscription_active: true,
        subscription_expires_at: expiresAt.toISOString(),
      })
      .eq("id", storeId);

    logger.info("Admin activated subscription", { storeId, planName, months });
    return { planName, expiresAt: expiresAt.toISOString() };
  }

  /**
   * Cron: expire subscriptions past their expiry date.
   * Returns the number of stores downgraded.
   */
  static async expireSubscriptions(): Promise<number> {
    const now = new Date().toISOString();

    // Find active store subscriptions past expiry
    const { data: expired } = await supabaseAdmin
      .from("stores")
      .select("id, subscription_plan")
      .eq("subscription_active", true)
      .not("subscription_expires_at", "is", null)
      .lt("subscription_expires_at", now);

    if (!expired || expired.length === 0) return 0;

    for (const store of expired) {
      await supabaseAdmin
        .from("seller_subscriptions")
        .update({ status: "EXPIRED" })
        .eq("store_id", store.id)
        .eq("status", "ACTIVE");

      await supabaseAdmin
        .from("stores")
        .update({
          subscription_plan: "free",
          subscription_active: true,
          subscription_expires_at: null,
        })
        .eq("id", store.id);

      logger.info("Subscription expired", { storeId: store.id, plan: store.subscription_plan });
    }

    return expired.length;
  }
}
