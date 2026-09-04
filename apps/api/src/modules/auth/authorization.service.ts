import { supabaseAdmin } from "../../config/supabase.js";
import { logger } from "../../config/logger.js";
import { UserRole } from "../../types/index.js";

export class AuthorizationService {
  /**
   * Verify the authenticated user owns the given order.
   * Returns the order if authorized, null otherwise.
   */
  static async requireOrderOwnership(
    orderId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<any> {
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id, buyer_id, store_orders(id, store_id)")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      logger.warn("Authorization: order not found", { orderId, userId });
      return null;
    }

    // Admin and Support can access any order
    if (userRole === UserRole.ADMIN || userRole === UserRole.SUPPORT) {
      return order;
    }

    // Buyer can only access their own orders
    if (userRole === UserRole.BUYER) {
      if (order.buyer_id !== userId) {
        logger.warn("Authorization: buyer access denied", {
          orderId,
          userId,
          orderBuyerId: order.buyer_id,
        });
        return null;
      }
      return order;
    }

    // Seller can only access orders containing their store's items
    if (userRole === UserRole.SELLER) {
      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("id")
        .eq("owner_id", userId)
        .single();

      if (!store) {
        logger.warn("Authorization: seller has no store", { userId });
        return null;
      }

      const hasStoreOrder = order.store_orders?.some(
        (so: any) => so.store_id === store.id,
      );

      if (!hasStoreOrder) {
        logger.warn("Authorization: seller access denied to order", {
          orderId,
          userId,
          storeId: store.id,
        });
        return null;
      }

      return order;
    }

    return null;
  }

  /**
   * Verify the authenticated user owns the given store.
   */
  static async requireStoreOwnership(
    storeId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<any> {
    // Admin can access any store
    if (userRole === UserRole.ADMIN) {
      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("*")
        .eq("id", storeId)
        .single();
      return store;
    }

    // Seller can only access their own store
    if (userRole === UserRole.SELLER) {
      const { data: store, error } = await supabaseAdmin
        .from("stores")
        .select("*")
        .eq("id", storeId)
        .eq("owner_id", userId)
        .single();

      if (error || !store) {
        logger.warn("Authorization: seller store access denied", {
          storeId,
          userId,
        });
        return null;
      }
      return store;
    }

    return null;
  }

  /**
   * Verify the authenticated user owns the given return request.
   */
  static async requireReturnOwnership(
    returnId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<any> {
    const { data: returnReq, error } = await supabaseAdmin
      .from("return_requests")
      .select("id, buyer_id, order_id, store_order_id")
      .eq("id", returnId)
      .single();

    if (error || !returnReq) {
      logger.warn("Authorization: return request not found", {
        returnId,
        userId,
      });
      return null;
    }

    // Admin and Support can access any return
    if (userRole === UserRole.ADMIN || userRole === UserRole.SUPPORT) {
      return returnReq;
    }

    // Buyer can only access their own returns
    if (userRole === UserRole.BUYER) {
      if (returnReq.buyer_id !== userId) {
        logger.warn("Authorization: buyer return access denied", {
          returnId,
          userId,
        });
        return null;
      }
      return returnReq;
    }

    // Seller can access returns for their store's orders
    if (userRole === UserRole.SELLER) {
      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("id")
        .eq("owner_id", userId)
        .single();

      if (!store) return null;

      const { data: storeOrder } = await supabaseAdmin
        .from("store_orders")
        .select("id")
        .eq("id", returnReq.store_order_id)
        .eq("store_id", store.id)
        .single();

      if (!storeOrder) {
        logger.warn("Authorization: seller return access denied", {
          returnId,
          userId,
          storeId: store.id,
        });
        return null;
      }

      return returnReq;
    }

    return null;
  }

  /**
   * Verify the authenticated user owns the given review.
   */
  static async requireReviewOwnership(
    reviewId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<any> {
    const { data: review, error } = await supabaseAdmin
      .from("reviews")
      .select("id, user_id, store_id")
      .eq("id", reviewId)
      .single();

    if (error || !review) {
      logger.warn("Authorization: review not found", { reviewId, userId });
      return null;
    }

    // Admin can moderate any review
    if (userRole === UserRole.ADMIN) {
      return review;
    }

    // Buyer can only access their own reviews
    if (userRole === UserRole.BUYER) {
      if (review.user_id !== userId) return null;
      return review;
    }

    // Seller can see reviews for their store (read-only, no ownership)
    if (userRole === UserRole.SELLER) {
      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("id")
        .eq("owner_id", userId)
        .single();

      if (store && review.store_id === store.id) {
        return review;
      }
      return null;
    }

    return null;
  }

  /**
   * Check if user has one of the allowed roles.
   */
  static requireRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
    return allowedRoles.includes(userRole);
  }

  /**
   * Verify the user's profile exists and is not banned.
   */
  static async validateProfile(
    userId: string,
  ): Promise<{ valid: boolean; profile?: any }> {
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("id, role, is_banned, phone, email")
      .eq("id", userId)
      .single();

    if (error || !profile) {
      return { valid: false };
    }

    if (profile.is_banned) {
      return { valid: false };
    }

    return { valid: true, profile };
  }
}
