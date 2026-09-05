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
}
