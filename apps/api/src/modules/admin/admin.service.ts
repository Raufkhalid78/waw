import { AuditService } from "../audit/audit.service.js";
import { supabaseAdmin } from "../../config/supabase.js";
import { PayoutStatus, StoreStatus } from "../../types/index.js";

export class AdminService {
  /**
   * Calculates overall platform metrics and financials from Supabase.
   */
  static async getPlatformStats() {
    const [
      { count: totalOrders },
      { count: totalSellers },
      { count: totalProducts },
      { data: orders },
      { data: storeOrders },
    ] = await Promise.all([
      supabaseAdmin.from("orders").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("stores").select("*", { count: "exact", head: true }),
      supabaseAdmin
        .from("products")
        .select("*", { count: "exact", head: true }),
      supabaseAdmin
        .from("orders")
        .select("total_pkr, cod_fee_pkr, payment_status, order_status"),
      supabaseAdmin
        .from("store_orders")
        .select("commission_pkr"),
    ]);

    const orderList = orders || [];
    const storeOrderList = storeOrders || [];
    const gmvPkr = orderList.reduce((sum, o) => sum + (o.total_pkr || 0), 0);
    const codFeesCollectedPkr = orderList.reduce(
      (sum, o) => sum + (o.cod_fee_pkr || 0),
      0,
    );
    const totalCommissionsPkr = storeOrderList.reduce(
      (sum, so) => sum + (so.commission_pkr || 0),
      0,
    );

    return {
      gmvPkr,
      totalOrders: totalOrders || 0,
      totalSellers: totalSellers || 0,
      totalProducts: totalProducts || 0,
      totalCommissionsPkr,
      codFeesCollectedPkr,
      netPlatformRevenuePkr: totalCommissionsPkr + codFeesCollectedPkr,
    };
  }

  /**
   * Lists products awaiting catalog/admin approval.
   */
  static async listPendingProducts() {
    const { data: products, error } = await supabaseAdmin
      .from("products")
      .select("*, store:stores(name, city), category:categories(name)")
      .eq("status", "PENDING_REVIEW")
      .order("created_at", { ascending: true });

    if (error) throw error;
    return products || [];
  }

  /**
   * Approves a pending seller product and makes it live in the public catalog.
   */
  static async approveProduct(productId: string, adminId?: string) {
    const { data: previousProduct } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    const { data: updatedProduct, error } = await supabaseAdmin
      .from("products")
      .update({
        status: "ACTIVE",
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId)
      .select()
      .single();

    if (error) throw error;

    // Activate default product variants
    await supabaseAdmin
      .from("product_variants")
      .update({ is_active: true })
      .eq("product_id", productId);

    await AuditService.logAction({
      actorId: adminId || "SYSTEM",
      actorRole: "SUPER_ADMIN",
      action: "PRODUCT_APPROVED",
      targetResourceType: "product",
      targetResourceId: productId,
      previousState: previousProduct,
      newState: updatedProduct,
      reason: "Product listing approved for public marketplace catalog",
    });

    return updatedProduct;
  }

  /**
   * Rejects a pending seller product with reason.
   */
  static async rejectProduct(productId: string, reason: string, adminId?: string) {
    const { data: previousProduct } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    const { data: updatedProduct, error } = await supabaseAdmin
      .from("products")
      .update({
        status: "REJECTED",
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId)
      .select()
      .single();

    if (error) throw error;

    await AuditService.logAction({
      actorId: adminId || "SYSTEM",
      actorRole: "SUPER_ADMIN",
      action: "PRODUCT_REJECTED",
      targetResourceType: "product",
      targetResourceId: productId,
      previousState: previousProduct,
      newState: updatedProduct,
      reason: reason || "Listing does not meet catalog quality or policy standards",
    });

    return updatedProduct;
  }

  /**
   * Lists reviews awaiting moderation.
   */
  static async listPendingReviews() {
    const { data: reviews, error } = await supabaseAdmin
      .from("reviews")
      .select("*, product:products(title, slug)")
      .eq("status", "PENDING")
      .order("created_at", { ascending: true });

    if (error) {
      // If status column not present on legacy table, return empty
      return [];
    }
    return reviews || [];
  }

  /**
   * Approves a customer review for public display.
   */
  static async approveReview(reviewId: string, adminId?: string) {
    const { data: review, error } = await supabaseAdmin
      .from("reviews")
      .update({ status: "APPROVED", is_approved: true })
      .eq("id", reviewId)
      .select()
      .single();

    if (error) throw error;

    await AuditService.logAction({
      actorId: adminId || "SYSTEM",
      actorRole: "SUPER_ADMIN",
      action: "REVIEW_APPROVED",
      targetResourceType: "review",
      targetResourceId: reviewId,
      reason: "Customer review approved by moderator",
    });

    return review;
  }

  /**
   * Rejects / removes a review.
   */
  static async rejectReview(reviewId: string, adminId?: string) {
    const { data: review, error } = await supabaseAdmin
      .from("reviews")
      .update({ status: "REJECTED", is_approved: false })
      .eq("id", reviewId)
      .select()
      .single();

    if (error) throw error;

    await AuditService.logAction({
      actorId: adminId || "SYSTEM",
      actorRole: "SUPER_ADMIN",
      action: "REVIEW_REJECTED",
      targetResourceType: "review",
      targetResourceId: reviewId,
      reason: "Customer review rejected by moderator",
    });

    return review;
  }

  /**
   * Lists customer disputes and escalated return requests.
   */
  static async listDisputes() {
    const { data: disputes, error } = await supabaseAdmin
      .from("return_requests")
      .select("*, order:orders(*), buyer:profiles(full_name, phone, email)")
      .order("created_at", { ascending: false });

    if (error) return [];
    return disputes || [];
  }

  /**
   * Resolves a customer dispute / return case.
   */
  static async resolveDispute(
    disputeId: string,
    resolution: "REFUND_ISSUED" | "REPLACEMENT_SENT" | "CLAIM_REJECTED",
    refundAmountPkr?: number,
    adminId?: string
  ) {
    const { data: dispute, error } = await supabaseAdmin
      .from("return_requests")
      .update({
        status: resolution,
        refund_amount_pkr: refundAmountPkr,
        updated_at: new Date().toISOString(),
      })
      .eq("id", disputeId)
      .select()
      .single();

    if (error) throw error;

    await AuditService.logAction({
      actorId: adminId || "SYSTEM",
      actorRole: "SUPER_ADMIN",
      action: "DISPUTE_RESOLVED",
      targetResourceType: "dispute",
      targetResourceId: disputeId,
      newState: dispute,
      reason: `Dispute resolved with status: ${resolution}`,
    });

    return dispute;
  }

  /**
   * Lists sellers with KYC status from Supabase.
   */
  static async listSellers(status?: StoreStatus) {
    let query = supabaseAdmin
      .from("stores")
      .select("*, owner:profiles(full_name, phone, email)");

    if (status) query = query.eq("status", status);

    const { data: stores } = await query.order("created_at", {
      ascending: false,
    });
    return stores || [];
  }

  /**
   * Updates seller status (ACTIVE, SUSPENDED, PENDING) and sets custom commission rate.
   */
  static async updateSellerStatus(
    storeId: string,
    status: StoreStatus,
    commissionRatePercentage?: number,
    adminId?: string
  ) {
    // 1. Fetch previous state for audit log
    const { data: previousStore } = await supabaseAdmin
      .from("stores")
      .select("*")
      .eq("id", storeId)
      .single();

    // 2. Perform update
    const { data: updatedStore, error } = await supabaseAdmin
      .from("stores")
      .update({
        status,
        is_verified: status === StoreStatus.ACTIVE,
        commission_rate_percentage: commissionRatePercentage ?? 10,
        updated_at: new Date().toISOString(),
      })
      .eq("id", storeId)
      .select()
      .single();

    if (error)
      throw new Error(`Failed to update store status: ${error.message}`);

    // 3. Immutably log the action
    await AuditService.logAction({
      actorId: adminId || "SYSTEM",
      actorRole: "SUPER_ADMIN",
      action: "KYC_STATUS_CHANGED",
      targetResourceType: "store",
      targetResourceId: storeId,
      previousState: previousStore,
      newState: updatedStore,
      reason: `Status changed to ${status}`,
    });

    return updatedStore;
  }

  /**
   * Lists seller payout records from Supabase.
   */
  static async listPayouts() {
    const { data: payouts } = await supabaseAdmin
      .from("payouts")
      .select("*, store:stores(name, city)")
      .order("created_at", { ascending: false });

    return payouts || [];
  }

  /**
   * Settles pending seller escrow payout via 1Link / Raast.
   */
  static async settlePayout(payoutId: string, transactionReference: string, adminId?: string) {
    // 1. Fetch previous state for audit log
    const { data: previousPayout } = await supabaseAdmin
      .from("payouts")
      .select("*")
      .eq("id", payoutId)
      .single();

    // 2. Perform update
    const { data: payout, error } = await supabaseAdmin
      .from("payouts")
      .update({
        status: PayoutStatus.COMPLETED,
        gateway_reference: transactionReference,
        processed_at: new Date().toISOString(),
      })
      .eq("id", payoutId)
      .select()
      .single();

    if (error) throw new Error(`Failed to settle payout: ${error.message}`);

    // 3. Immutably log the action
    await AuditService.logAction({
      actorId: adminId || "SYSTEM",
      actorRole: "SUPER_ADMIN",
      action: "PAYOUT_SETTLED",
      targetResourceType: "payout",
      targetResourceId: payoutId,
      previousState: previousPayout,
      newState: payout,
      reason: `Settled with bank reference ${transactionReference}`,
    });

    return payout;
  }
}

