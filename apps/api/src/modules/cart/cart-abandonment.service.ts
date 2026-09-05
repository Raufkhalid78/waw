import { supabaseAdmin } from "../../config/supabase.js";
import { logger } from "../../config/logger.js";

export class CartAbandonmentService {
  private static readonly CHECKOUT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  private static readonly EMAIL_DELAYS = [
    { hours: 1, template: "cart_reminder_1h" },
    { hours: 24, template: "cart_reminder_24h" },
    { hours: 72, template: "cart_reminder_72h" },
  ];

  /**
   * Records a checkout session start for tracking abandonment.
   */
  static async trackCheckoutStart(userId: string, cartItems: any[]): Promise<void> {
    try {
      const { error } = await supabaseAdmin.from("cart_abandonment").upsert(
        {
          user_id: userId,
          cart_snapshot: cartItems,
          checkout_started_at: new Date().toISOString(),
          reminder_sent: false,
          recovered: false,
        },
        { onConflict: "user_id" },
      );

      if (error) {
        logger.error("Failed to track checkout start", "CartAbandonment", error);
      }
    } catch (err) {
      logger.error("Cart abandonment tracking error", "CartAbandonment", err);
    }
  }

  /**
   * Marks a cart as recovered (order placed).
   */
  static async markRecovered(userId: string, orderId: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from("cart_abandonment")
        .update({
          recovered: true,
          recovered_at: new Date().toISOString(),
          order_id: orderId,
        })
        .eq("user_id", userId)
        .eq("recovered", false);

      if (error) {
        logger.error("Failed to mark cart recovered", "CartAbandonment", error);
      }
    } catch (err) {
      logger.error("Cart recovery marking error", "CartAbandonment", err);
    }
  }

  /**
   * Returns carts that were started but not completed and haven't been reminded yet.
   * This is called by a cron job.
   */
  static async getAbandonedCarts(): Promise<any[]> {
    try {
      const cutoff = new Date(
        Date.now() - this.CHECKOUT_TIMEOUT_MS,
      ).toISOString();

      const { data, error } = await supabaseAdmin
        .from("cart_abandonment")
        .select("*")
        .eq("recovered", false)
        .eq("reminder_sent", false)
        .lt("checkout_started_at", cutoff)
        .limit(100);

      if (error) {
        logger.error("Failed to fetch abandoned carts", "CartAbandonment", error);
        return [];
      }

      return data || [];
    } catch (err) {
      logger.error("Cart abandonment fetch error", "CartAbandonment", err);
      return [];
    }
  }

  /**
   * Marks a cart as reminded so we don't spam the user.
   */
  static async markReminded(userId: string): Promise<void> {
    try {
      await supabaseAdmin
        .from("cart_abandonment")
        .update({ reminder_sent: true, reminded_at: new Date().toISOString() })
        .eq("user_id", userId);
    } catch (err) {
      logger.error("Failed to mark cart reminded", "CartAbandonment", err);
    }
  }

  /**
   * Gets pending abandonment reminders for the cron job to process.
   */
  static async getPendingReminders(): Promise<any[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from("cart_abandonment")
        .select("*")
        .eq("recovered", false)
        .is("reminder_sent", false)
        .order("checkout_started_at", { ascending: true })
        .limit(50);

      if (error) {
        logger.error("Failed to fetch pending reminders", "CartAbandonment", error);
        return [];
      }

      return data || [];
    } catch (err) {
      logger.error("Pending reminders fetch error", "CartAbandonment", err);
      return [];
    }
  }
}
