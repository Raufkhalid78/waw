import { supabaseAdmin } from "../../config/supabase.js";
import { logger } from "../../config/logger.js";

const POINTS_PER_PKR = 10; // 1 point per PKR 100 spent
const REDEMPTION_RATE = 0.5; // PKR value per 1 point
const MIN_REDEEM = 100; // Minimum points to redeem
const MAX_REDEMPTION_PCT = 30; // Max order % payable with points

export class LoyaltyService {
  /**
   * Get or create loyalty points record for a user
   */
  static async getBalance(userId: string) {
    const { data, error } = await supabaseAdmin
      .from("loyalty_points")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code === "PGRST116") {
      // Create new record
      const { data: created } = await supabaseAdmin
        .from("loyalty_points")
        .insert({ user_id: userId, points_balance: 0 })
        .select()
        .single();
      return created || { points_balance: 0, total_earned: 0, total_redeemed: 0 };
    }

    return data || { points_balance: 0, total_earned: 0, total_redeemed: 0 };
  }

  /**
   * Earn points from a completed order
   */
  static async earnFromOrder(userId: string, orderId: string, orderTotalPkr: number) {
    const settings = await this.getSettings();
    const pointsToEarn = Math.floor((orderTotalPkr / 100) * settings.pointsPerPkr);

    if (pointsToEarn <= 0) return null;

    // Upsert balance
    const { data: existing } = await supabaseAdmin
      .from("loyalty_points")
      .select("id, points_balance, total_earned")
      .eq("user_id", userId)
      .single();

    if (existing) {
      await supabaseAdmin
        .from("loyalty_points")
        .update({
          points_balance: existing.points_balance + pointsToEarn,
          total_earned: existing.total_earned + pointsToEarn,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabaseAdmin.from("loyalty_points").insert({
        user_id: userId,
        points_balance: pointsToEarn,
        total_earned: pointsToEarn,
      });
    }

    // Log transaction
    await supabaseAdmin.from("loyalty_transactions").insert({
      user_id: userId,
      type: "EARN",
      points: pointsToEarn,
      order_id: orderId,
      description: `Earned ${pointsToEarn} points from order`,
    });

    logger.info("Loyalty points earned", { userId, orderId, points: pointsToEarn });
    return pointsToEarn;
  }

  /**
   * Calculate redeemable amount for an order total
   */
  static async calculateRedemption(userId: string, orderTotalPkr: number) {
    const settings = await this.getSettings();
    const balance = await this.getBalance(userId);

    const maxRedeemableByPolicy = Math.floor((orderTotalPkr * settings.maxRedemptionPct) / 100);
    const maxPointsByValue = Math.floor(maxRedeemableByPolicy / settings.redemptionRate);
    const actualPoints = Math.min(balance.points_balance, maxPointsByValue);

    if (actualPoints < settings.minRedeem) {
      return { points: 0, discountPkr: 0, remainingBalance: balance.points_balance };
    }

    const discountPkr = actualPoints * settings.redemptionRate;

    return {
      points: actualPoints,
      discountPkr,
      remainingBalance: balance.points_balance - actualPoints,
    };
  }

  /**
   * Redeem points at checkout
   */
  static async redeem(userId: string, orderId: string, points: number, orderTotalPkr: number) {
    const settings = await this.getSettings();

    if (points < settings.minRedeem) {
      throw new Error(`Minimum ${settings.minRedeem} points required to redeem`);
    }

    const balance = await this.getBalance(userId);
    if (balance.points_balance < points) {
      throw new Error("Insufficient loyalty points");
    }

    const maxRedeemable = Math.floor((orderTotalPkr * settings.maxRedemptionPct) / 100);
    const maxPoints = Math.floor(maxRedeemable / settings.redemptionRate);
    const actualPoints = Math.min(points, maxPoints);
    const discountPkr = actualPoints * settings.redemptionRate;

    // Deduct points
    await supabaseAdmin
      .from("loyalty_points")
      .update({
        points_balance: balance.points_balance - actualPoints,
        total_redeemed: balance.total_redeemed + actualPoints,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    // Log transaction
    await supabaseAdmin.from("loyalty_transactions").insert({
      user_id: userId,
      type: "REDEEM",
      points: -actualPoints,
      order_id: orderId,
      description: `Redeemed ${actualPoints} points for PKR ${discountPkr} discount`,
    });

    logger.info("Loyalty points redeemed", { userId, orderId, points: actualPoints, discountPkr });
    return { points: actualPoints, discountPkr };
  }

  /**
   * Get transaction history
   */
  static async getHistory(userId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const { data, error } = await supabaseAdmin
      .from("loyalty_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const { count } = await supabaseAdmin
      .from("loyalty_transactions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    return {
      transactions: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  /**
   * Get loyalty settings
   */
  static async getSettings() {
    const { data } = await supabaseAdmin
      .from("marketplace_settings")
      .select("key, value")
      .in("key", [
        "loyalty_points_per_pkr",
        "loyalty_redemption_rate",
        "loyalty_min_redeem",
        "loyalty_max_redemption_pct",
      ]);

    const settings: Record<string, string> = {};
    (data || []).forEach((row: any) => {
      settings[row.key] = row.value;
    });

    return {
      pointsPerPkr: parseInt(settings.loyalty_points_per_pkr || "10", 10),
      redemptionRate: parseFloat(settings.loyalty_redemption_rate || "0.5"),
      minRedeem: parseInt(settings.loyalty_min_redeem || "100", 10),
      maxRedemptionPct: parseInt(settings.loyalty_max_redemption_pct || "30", 10),
    };
  }
}
