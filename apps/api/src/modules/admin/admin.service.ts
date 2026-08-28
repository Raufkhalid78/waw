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
        .from("catalog_products")
        .select("*", { count: "exact", head: true }),
      supabaseAdmin
        .from("orders")
        .select("total_amount_pkr, payment_status, global_status"),
      supabaseAdmin
        .from("store_orders")
        .select("commission_pkr"),
    ]);

    const orderList: any[] = orders || [];
    const storeOrderList: any[] = storeOrders || [];
    const gmvPkr = orderList.reduce((sum, o) => sum + (o.total_amount_pkr || o.total_pkr || 0), 0);
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
      codFeesCollectedPkr: 0,
      netPlatformRevenuePkr: totalCommissionsPkr,
    };
  }

  /**
   * Lists offers awaiting catalog/admin approval.
   */
  static async listPendingProducts() {
    const { data: offers, error } = await supabaseAdmin
      .from("seller_offers")
      .select("*, catalog_product:catalog_products(*), store:stores(name, city)")
      .eq("status", "PENDING")
      .order("created_at", { ascending: true });

    if (error) throw error;
    return offers || [];
  }

  /**
   * Approves a pending seller offer and makes it live in the public catalog.
   */
  static async approveProduct(offerId: string, adminId?: string) {
    const { data: previousOffer } = await supabaseAdmin
      .from("seller_offers")
      .select("*, catalog_product:catalog_products(*)")
      .eq("id", offerId)
      .single();

    const { data: updatedOffer, error } = await supabaseAdmin
      .from("seller_offers")
      .update({
        status: "ACTIVE",
        updated_at: new Date().toISOString(),
      })
      .eq("id", offerId)
      .select()
      .single();

    if (error) throw error;

    if (previousOffer?.catalog_product_id) {
      await supabaseAdmin
        .from("catalog_products")
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq("id", previousOffer.catalog_product_id);
    }

    await AuditService.logAction({
      actorId: adminId || "SYSTEM",
      actorRole: "SUPER_ADMIN",
      action: "PRODUCT_APPROVED",
      targetResourceType: "offer",
      targetResourceId: offerId,
      previousState: previousOffer,
      newState: updatedOffer,
      reason: "Product offer listing approved for public marketplace catalog",
    });

    return updatedOffer;
  }

  /**
   * Rejects a pending seller offer with reason.
   */
  static async rejectProduct(offerId: string, reason: string, adminId?: string) {
    const { data: previousOffer } = await supabaseAdmin
      .from("seller_offers")
      .select("*")
      .eq("id", offerId)
      .single();

    const { data: updatedOffer, error } = await supabaseAdmin
      .from("seller_offers")
      .update({
        status: "REJECTED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", offerId)
      .select()
      .single();

    if (error) throw error;

    await AuditService.logAction({
      actorId: adminId || "SYSTEM",
      actorRole: "SUPER_ADMIN",
      action: "PRODUCT_REJECTED",
      targetResourceType: "offer",
      targetResourceId: offerId,
      previousState: previousOffer,
      newState: updatedOffer,
      reason: reason || "Listing does not meet catalog quality or policy standards",
    });

    return updatedOffer;
  }

  /**
   * Lists reviews awaiting moderation.
   */
  static async listPendingReviews() {
    const { data: reviews, error } = await supabaseAdmin
      .from("reviews")
      .select("*, product:catalog_products(title, slug)")
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

