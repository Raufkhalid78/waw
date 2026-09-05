import { supabaseAdmin } from "../../config/supabase.js";
import { logger } from "../../config/logger.js";

export class ReferralService {
  /**
   * Generate a unique referral code for a user
   */
  static async generateCode(userId: string): Promise<string> {
    // Check if user already has a code
    const { data: existing } = await supabaseAdmin
      .from("referral_codes")
      .select("code")
      .eq("user_id", userId)
      .single();

    if (existing) return existing.code;

    // Generate 8-char alphanumeric code
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I/O/0/1 to avoid confusion
    let code = "WAW";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const { data, error } = await supabaseAdmin
      .from("referral_codes")
      .insert({ user_id: userId, code })
      .select("code")
      .single();

    if (error) throw error;
    return data.code;
  }

  /**
   * Validate a referral code
   */
  static async validateCode(code: string) {
    const { data, error } = await supabaseAdmin
      .from("referral_codes")
      .select("code, user_id")
      .eq("code", code.toUpperCase())
      .single();

    if (error || !data) return null;
    return data;
  }

  /**
   * Apply referral at signup (called when referred user registers)
   */
  static async applyReferral(referredUserId: string, referralCode: string) {
    const codeData = await this.validateCode(referralCode);
    if (!codeData || codeData.user_id === referredUserId) return null;

    // Check if already referred
    const { data: existingReferral } = await supabaseAdmin
      .from("referrals")
      .select("id")
      .eq("referred_user_id", referredUserId)
      .single();

    if (existingReferral) return null;

    // Get settings
    const settings = await this.getSettings();

    // Check referrer reward limit
    const { count } = await supabaseAdmin
      .from("referrals")
      .select("*", { count: "exact", head: true })
      .eq("referrer_user_id", codeData.user_id)
      .eq("status", "REWARDED");

    if ((count || 0) >= settings.maxRewards) return null;

    // Create referral record
    const { data: referral, error } = await supabaseAdmin
      .from("referrals")
      .insert({
        referrer_user_id: codeData.user_id,
        referred_user_id: referredUserId,
        referral_code: referralCode.toUpperCase(),
        status: "PENDING",
      })
      .select()
      .single();

    if (error) throw error;

    logger.info("Referral applied", {
      referrerId: codeData.user_id,
      referredUserId,
      referralCode,
    });

    return referral;
  }

  /**
   * Complete referral reward (called after referred user's first qualifying order)
   */
  static async completeReferral(referredUserId: string, orderTotalPkr: number) {
    const settings = await this.getSettings();

    if (orderTotalPkr < settings.minOrderPkr) return null;

    const { data: referral } = await supabaseAdmin
      .from("referrals")
      .select("*")
      .eq("referred_user_id", referredUserId)
      .eq("status", "PENDING")
      .single();

    if (!referral) return null;

    // Update referral status
    await supabaseAdmin
      .from("referrals")
      .update({
        status: "REWARDED",
        reward_pkr: settings.rewardReferrerPkr + settings.rewardReferredPkr,
        completed_at: new Date().toISOString(),
      })
      .eq("id", referral.id);

    // Credit referrer with loyalty points equivalent
    const referrerPoints = settings.rewardReferrerPkr * 2; // 2 points per PKR
    try {
      await supabaseAdmin.rpc("increment_loyalty_points", {
        p_user_id: referral.referrer_user_id,
        p_points: referrerPoints,
      });
    } catch {
      // Fallback: direct upsert
      await supabaseAdmin.from("loyalty_points").upsert({
        user_id: referral.referrer_user_id,
        points_balance: referrerPoints,
        total_earned: referrerPoints,
      }, { onConflict: "user_id" });
    }

    // Credit referred user with loyalty points
    const referredPoints = settings.rewardReferredPkr * 2;
    try {
      await supabaseAdmin.rpc("increment_loyalty_points", {
        p_user_id: referredUserId,
        p_points: referredPoints,
      });
    } catch {
      await supabaseAdmin.from("loyalty_points").upsert({
        user_id: referredUserId,
        points_balance: referredPoints,
        total_earned: referredPoints,
      }, { onConflict: "user_id" });
    }

    logger.info("Referral completed", {
      referralId: referral.id,
      referrerId: referral.referrer_user_id,
      referredUserId,
      referrerPoints,
      referredPoints,
    });

    return referral;
  }

  /**
   * Get referral stats for a user
   */
  static async getStats(userId: string) {
    const { data: code } = await supabaseAdmin
      .from("referral_codes")
      .select("code")
      .eq("user_id", userId)
      .single();

    const { data: referrals } = await supabaseAdmin
      .from("referrals")
      .select("id, status, reward_pkr, created_at, completed_at")
      .eq("referrer_user_id", userId)
      .order("created_at", { ascending: false });

    const totalReferrals = (referrals || []).length;
    const completedReferrals = (referrals || []).filter((r) => r.status === "REWARDED").length;
    const totalEarnings = (referrals || [])
      .filter((r) => r.status === "REWARDED")
      .reduce((sum, r) => sum + (r.reward_pkr || 0), 0);

    return {
      code: code?.code || null,
      totalReferrals,
      completedReferrals,
      totalEarnings,
      referrals: referrals || [],
    };
  }

  /**
   * Get referral settings
   */
  static async getSettings() {
    const { data } = await supabaseAdmin
      .from("marketplace_settings")
      .select("key, value")
      .in("key", [
        "referral_reward_referrer_pkr",
        "referral_reward_referred_pkr",
        "referral_min_order_pkr",
        "referral_max_rewards",
      ]);

    const settings: Record<string, string> = {};
    (data || []).forEach((row: any) => {
      settings[row.key] = row.value;
    });

    return {
      rewardReferrerPkr: parseInt(settings.referral_reward_referrer_pkr || "200", 10),
      rewardReferredPkr: parseInt(settings.referral_reward_referred_pkr || "100", 10),
      minOrderPkr: parseInt(settings.referral_min_order_pkr || "500", 10),
      maxRewards: parseInt(settings.referral_max_rewards || "50", 10),
    };
  }
}
