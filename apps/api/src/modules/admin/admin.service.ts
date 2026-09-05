import { AuditService } from "../audit/audit.service.js";
import { supabaseAdmin } from "../../config/supabase.js";
import { logger } from "../../config/logger.js";
import { PayoutStatus, StoreStatus } from "../../types/index.js";

export class AdminService {
  /**
   * Calculates overall platform metrics and financials from Supabase.
   */
  static async getPlatformStats() {
    // Run queries independently so one failure doesn't break everything
    const safeQuery = async (builder: any) => {
      try { return await builder; } catch { return { count: 0, data: [], error: null }; }
    };

    const [ordersCount, sellersCount, productsCount, ordersResult, storeOrdersResult] = await Promise.all([
      safeQuery(supabaseAdmin.from("orders").select("*", { count: "exact", head: true })),
      safeQuery(supabaseAdmin.from("stores").select("*", { count: "exact", head: true })),
      safeQuery(supabaseAdmin.from("catalog_products").select("*", { count: "exact", head: true })),
      safeQuery(supabaseAdmin.from("orders").select("total_amount_pkr").limit(10000)),
      safeQuery(supabaseAdmin.from("store_orders").select("commission_pkr").limit(10000)),
    ]);

    const orderList: any[] = ordersResult.data || [];
    const storeOrderList: any[] = storeOrdersResult.data || [];
    const gmvPkr = orderList.reduce((sum: number, o: any) => sum + (o.total_amount_pkr || 0), 0);
    const totalCommissionsPkr = storeOrderList.reduce(
      (sum: number, so: any) => sum + (so.commission_pkr || 0), 0,
    );

    return {
      gmvPkr,
      totalOrders: ordersCount.count || 0,
      totalSellers: sellersCount.count || 0,
      totalProducts: productsCount.count || 0,
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
   * Lists all products (seller_offers) with pagination and search.
   */
  static async listAllProducts(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from("seller_offers")
      .select(
        "id, sku, price_pkr, original_price_pkr, condition, status, created_at, store_id, catalog_product:catalog_products(id, title, slug, images, is_active), store:stores(name)",
        { count: "exact" },
      );

    if (params?.search) {
      query = query.ilike("sku", `%${params.search}%`);
    }

    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: offers, error, count } = await query;

    if (error) {
      logger.error("Admin products query failed", { message: error.message, details: error.details, hint: error.hint });
      throw error;
    }

    const products = (offers || []).map((o: any) => ({
      id: o.id,
      title: o.catalog_product?.title || "—",
      slug: o.catalog_product?.slug || "—",
      price_pkr: o.price_pkr,
      status: o.status,
      store_id: o.store_id,
      store_name: o.store?.name || "—",
      images: o.catalog_product?.images || [],
      created_at: o.created_at,
    }));

    return { products, total: count || 0 };
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
   * Lists merchant applications awaiting KYC verification.
   */
  static async listPendingKyc() {
    const { data: stores, error } = await supabaseAdmin
      .from("stores")
      .select("*, owner:profiles(full_name, phone, email)")
      .in("status", ["PENDING_KYC", "PENDING"])
      .order("created_at", { ascending: true });

    if (error) throw error;
    return stores || [];
  }

  /**
   * Approves a merchant KYC application, marks verified, and sets custom commission.
   */
  static async approveKyc(storeId: string, commissionRatePercentage?: number, adminId?: string) {
    const { data: previousStore } = await supabaseAdmin
      .from("stores")
      .select("*")
      .eq("id", storeId)
      .single();

    const { data: updatedStore, error } = await supabaseAdmin
      .from("stores")
      .update({
        status: "ACTIVE",
        is_verified: true,
        commission_rate_percentage: commissionRatePercentage ?? 10,
        updated_at: new Date().toISOString(),
      })
      .eq("id", storeId)
      .select()
      .single();

    if (error) throw error;

    await AuditService.logAction({
      actorId: adminId || "SYSTEM",
      actorRole: "SUPER_ADMIN",
      action: "SELLER_KYC_APPROVED",
      targetResourceType: "store",
      targetResourceId: storeId,
      previousState: previousStore,
      newState: updatedStore,
      reason: `Seller KYC verified and store activated with ${commissionRatePercentage ?? 10}% commission`,
    });

    return updatedStore;
  }

  /**
   * Rejects a merchant KYC application with a recorded reason.
   */
  static async rejectKyc(storeId: string, reason: string, adminId?: string) {
    const { data: previousStore } = await supabaseAdmin
      .from("stores")
      .select("*")
      .eq("id", storeId)
      .single();

    const { data: updatedStore, error } = await supabaseAdmin
      .from("stores")
      .update({
        status: "REJECTED",
        is_verified: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", storeId)
      .select()
      .single();

    if (error) throw error;

    await AuditService.logAction({
      actorId: adminId || "SYSTEM",
      actorRole: "SUPER_ADMIN",
      action: "SELLER_KYC_REJECTED",
      targetResourceType: "store",
      targetResourceId: storeId,
      previousState: previousStore,
      newState: updatedStore,
      reason: reason || "KYC documents or banking details did not pass verification",
    });

    return updatedStore;
  }

  /**
   * Lists sellers with KYC status from Supabase.
   */
  static async listSellers(status?: StoreStatus, page = 1, limit = 50) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabaseAdmin
      .from("stores")
      .select("*, owner:profiles(full_name, phone, email)", { count: "exact" });

    if (status) query = query.eq("status", status);

    const { data: stores, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    return {
      sellers: stores || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
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
  static async listPayouts(page = 1, limit = 50) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: payouts, count } = await supabaseAdmin
      .from("payouts")
      .select("*, store:stores(name, city)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    return {
      payouts: payouts || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
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

  /**
   * Lists all orders with pagination for admin dashboard.
   */
  static async listAllOrders(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from("orders")
      .select(
        "*, buyer:profiles!orders_buyer_id_fkey(full_name, phone)",
        { count: "exact" },
      );

    if (params?.status) {
      query = query.eq("global_status", params.status);
    }

    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: orders, error, count } = await query;
    if (error) throw error;

    const formatted = (orders || []).map((o: any) => ({
      id: o.id,
      order_number: o.order_number,
      buyer_id: o.buyer_id,
      buyer_name: o.buyer?.full_name || "Guest",
      buyer_phone: o.buyer?.phone || "",
      shipping_address: o.shipping_address,
      shipping_city: o.shipping_city,
      total_amount_pkr: o.total_amount_pkr,
      payment_method: o.payment_method,
      payment_status: o.payment_status,
      global_status: o.global_status,
      item_count: o.item_count,
      created_at: o.created_at,
    }));

    return { orders: formatted, total: count || 0 };
  }

  /**
   * Lists all users with pagination for admin dashboard.
   */
  static async listAllUsers(params?: {
    page?: number;
    limit?: number;
    role?: string;
  }) {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact" });

    if (params?.role) {
      query = query.eq("role", params.role);
    }

    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: users, error, count } = await query;
    if (error) throw error;

    return { users: users || [], total: count || 0 };
  }

  /**
   * Bans a user by setting is_banned on their profile.
   */
  static async banUser(userId: string, adminId?: string) {
    const { data: previousUser } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    const { data: updatedUser, error } = await supabaseAdmin
      .from("profiles")
      .update({
        is_banned: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;

    await AuditService.logAction({
      actorId: adminId || "SYSTEM",
      actorRole: "SUPER_ADMIN",
      action: "USER_BANNED",
      targetResourceType: "profile",
      targetResourceId: userId,
      previousState: previousUser,
      newState: updatedUser,
      reason: "User banned by admin",
    });

    return updatedUser;
  }

  /**
   * Unbans a user by clearing is_banned on their profile.
   */
  static async unbanUser(userId: string, adminId?: string) {
    const { data: previousUser } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    const { data: updatedUser, error } = await supabaseAdmin
      .from("profiles")
      .update({
        is_banned: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;

    await AuditService.logAction({
      actorId: adminId || "SYSTEM",
      actorRole: "SUPER_ADMIN",
      action: "USER_UNBANNED",
      targetResourceType: "profile",
      targetResourceId: userId,
      previousState: previousUser,
      newState: updatedUser,
      reason: "User unbanned by admin",
    });

    return updatedUser;
  }

  /**
   * Lists customer return requests with order and buyer details.
   */
  static async listReturns(status?: string) {
    let query = supabaseAdmin
      .from("return_requests")
      .select("*, order:orders(*), return_items(*), buyer:profiles(full_name, phone, email)")
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data: returns, error } = await query;
    if (error) throw error;
    return returns || [];
  }

  /**
   * Marks a returned parcel as received at the central warehouse.
   */
  static async receiveReturn(returnId: string, adminId?: string, staffNotes?: string) {
    const { data: previousReturn } = await supabaseAdmin
      .from("return_requests")
      .select("*")
      .eq("id", returnId)
      .single();

    const { data: updatedReturn, error } = await supabaseAdmin
      .from("return_requests")
      .update({
        status: "RECEIVED",
        staff_notes: staffNotes || previousReturn?.staff_notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", returnId)
      .select()
      .single();

    if (error) throw error;

    await AuditService.logAction({
      actorId: adminId || "SYSTEM",
      actorRole: "SUPER_ADMIN",
      action: "RETURN_PARCEL_RECEIVED",
      targetResourceType: "return_request",
      targetResourceId: returnId,
      previousState: previousReturn,
      newState: updatedReturn,
      reason: "Warehouse staff marked return package as received and inspected",
    });

    return updatedReturn;
  }

  /**
   * Approves a customer return, issues double-entry RETURN_RESTOCK in inventory,
   * freezes/cancels the seller payout, and marks order as REFUNDED.
   */
  static async approveReturnRefund(returnId: string, adminId?: string, staffNotes?: string) {
    const { data: returnReq, error: retErr } = await supabaseAdmin
      .from("return_requests")
      .select("*, return_items(*), order:orders(*, store_orders(*, order_items(*)))")
      .eq("id", returnId)
      .single();

    if (retErr || !returnReq) throw new Error("Return request not found");

    // 1. Update return request status
    const { data: updatedReturn, error: updateErr } = await supabaseAdmin
      .from("return_requests")
      .update({
        status: "REFUNDED",
        staff_notes: staffNotes || returnReq.staff_notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", returnId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // 2. Restock inventory in ledger
    const { InventoryService } = await import("../products/inventory.service.js");
    const storeOrders = returnReq.order?.store_orders || [];
    for (const so of storeOrders) {
      for (const item of so.order_items || []) {
        if (item.offer_variant_id && item.quantity > 0) {
          await InventoryService.recordReturnRestock({
            storeId: so.store_id,
            offerVariantId: item.offer_variant_id,
            quantity: item.quantity,
            returnRequestId: returnId,
            actorId: adminId || "ADMIN",
            notes: `Restocked upon return refund approval #${returnId}`,
          });
        }
      }
    }

    // 3. Freeze / Cancel seller escrow payouts
    if (returnReq.store_order_id) {
      await supabaseAdmin
        .from("payouts")
        .update({
          status: PayoutStatus.HELD,
          updated_at: new Date().toISOString(),
        })
        .eq("store_order_id", returnReq.store_order_id);
    }

    // 4. Update parent order status
    if (returnReq.order_id) {
      await supabaseAdmin
        .from("orders")
        .update({
          global_status: "REFUNDED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", returnReq.order_id);
    }

    // 5. Immutable Audit Log
    await AuditService.logAction({
      actorId: adminId || "SYSTEM",
      actorRole: "SUPER_ADMIN",
      action: "RETURN_REFUND_APPROVED",
      targetResourceType: "return_request",
      targetResourceId: returnId,
      previousState: returnReq,
      newState: updatedReturn,
      reason: `Return refund approved for PKR ${returnReq.refund_amount_pkr}. Stock restored and seller payout held.`,
    });

    return updatedReturn;
  }

  /**
   * Rejects a return request with recorded reason.
   */
  static async rejectReturn(returnId: string, reason: string, adminId?: string) {
    const { data: previousReturn } = await supabaseAdmin
      .from("return_requests")
      .select("*")
      .eq("id", returnId)
      .single();

    const { data: updatedReturn, error } = await supabaseAdmin
      .from("return_requests")
      .update({
        status: "REJECTED",
        staff_notes: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", returnId)
      .select()
      .single();

    if (error) throw error;

    await AuditService.logAction({
      actorId: adminId || "SYSTEM",
      actorRole: "SUPER_ADMIN",
      action: "RETURN_REJECTED",
      targetResourceType: "return_request",
      targetResourceId: returnId,
      previousState: previousReturn,
      newState: updatedReturn,
      reason: reason || "Return package rejected upon warehouse inspection",
    });

    return updatedReturn;
  }

  // ── Flash Sales Management ──────────────────────────────────────────────

  static async listFlashSales() {
    const { data, error } = await supabaseAdmin
      .from("flash_sales")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async createFlashSale(input: {
    name: string;
    starts_at: string;
    ends_at: string;
    discount_percent?: number;
  }) {
    const { data, error } = await supabaseAdmin
      .from("flash_sales")
      .insert({
        id: `fs_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: input.name,
        starts_at: input.starts_at,
        ends_at: input.ends_at,
        discount_percent: input.discount_percent || 0,
        is_active: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateFlashSale(id: string, input: { name?: string; starts_at?: string; ends_at?: string; is_active?: boolean; discount_percent?: number }) {
    const { data, error } = await supabaseAdmin
      .from("flash_sales")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteFlashSale(id: string) {
    const { error } = await supabaseAdmin
      .from("flash_sales")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return { success: true };
  }

  static async addFlashSaleItem(flashSaleId: string, productId: string, salePricePkr: number, stockQuantity: number) {
    const { data, error } = await supabaseAdmin
      .from("flash_sale_items")
      .insert({
        id: `fsi_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        flash_sale_id: flashSaleId,
        product_id: productId,
        sale_price_pkr: salePricePkr,
        stock_quantity: stockQuantity,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async removeFlashSaleItem(itemId: string) {
    const { error } = await supabaseAdmin
      .from("flash_sale_items")
      .delete()
      .eq("id", itemId);

    if (error) throw error;
    return { success: true };
  }

  // ── Banner/Campaign Management ─────────────────────────────────────────

  static async listBanners() {
    const { data, error } = await supabaseAdmin
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async createBanner(input: {
    title: string;
    subtitle?: string;
    image_url: string;
    link_url?: string;
    position?: string;
    starts_at?: string;
    ends_at?: string;
  }) {
    const { data, error } = await supabaseAdmin
      .from("campaigns")
      .insert({
        id: `banner_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: input.title,
        subtitle: input.subtitle || "",
        image_url: input.image_url,
        link_url: input.link_url || "/",
        position: input.position || "homepage",
        starts_at: input.starts_at || new Date().toISOString(),
        ends_at: input.ends_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateBanner(id: string, input: { title?: string; subtitle?: string; image_url?: string; link_url?: string; is_active?: boolean; position?: string }) {
    const { data, error } = await supabaseAdmin
      .from("campaigns")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteBanner(id: string) {
    const { error } = await supabaseAdmin
      .from("campaigns")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return { success: true };
  }

  // ── Category Management ────────────────────────────────────────────────

  static async listCategories() {
    const { data, error } = await supabaseAdmin
      .from("categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async createCategory(input: {
    name: string;
    name_urdu?: string;
    slug: string;
    description?: string;
    parent_id?: string;
    image_url?: string;
  }) {
    const { data, error } = await supabaseAdmin
      .from("categories")
      .insert({
        id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: input.name,
        name_urdu: input.name_urdu || "",
        slug: input.slug,
        description: input.description || "",
        parent_id: input.parent_id || null,
        image_url: input.image_url || "",
        is_active: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateCategory(id: string, input: { name?: string; name_urdu?: string; slug?: string; description?: string; is_active?: boolean; image_url?: string }) {
    const { data, error } = await supabaseAdmin
      .from("categories")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteCategory(id: string) {
    const { error } = await supabaseAdmin
      .from("categories")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return { success: true };
  }
}

