import { Request, Response } from "express";
import { openRouterService } from "./openrouter.service.js";
import { supabaseAdmin } from "../../config/supabase.js";
import { logger } from "../../config/logger.js";

export class AIController {
  // POST /api/ai/generate-description — subscription-gated
  static async generateDescription(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { product_id, product_name, category, attributes } = req.body;

      if (!product_name || !category) {
        res.status(400).json({ error: "product_name and category are required" });
        return;
      }

      // Check seller subscription status
      const { data: seller } = await supabaseAdmin
        .from("sellers")
        .select("subscription_plan, subscription_active")
        .eq("user_id", user.id)
        .single();

      if (!seller || !seller.subscription_active || seller.subscription_plan === "free") {
        res.status(403).json({
          error: "Product Description Generator requires an active Pro or Enterprise subscription",
          code: "SUBSCRIPTION_REQUIRED",
        });
        return;
      }

      const description = await openRouterService.generateProductDescription(
        product_name,
        category,
        attributes || {},
        user.id,
      );

      // If product_id provided, optionally update the product
      if (product_id) {
        await supabaseAdmin
          .from("products")
          .update({ description })
          .eq("id", product_id);
      }

      res.json({ description, product_id: product_id || null });
    } catch (err: any) {
      if (err.message.includes("token limit")) {
        res.status(429).json({ error: err.message, code: "TOKEN_LIMIT_REACHED" });
        return;
      }
      logger.error("AI description generation failed", { error: err.message });
      res.status(500).json({ error: "Failed to generate description" });
    }
  }

  // POST /api/ai/chat — free for all users
  static async chat(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { query, product_id } = req.body;

      if (!query) {
        res.status(400).json({ error: "query is required" });
        return;
      }

      let productInfo = "No specific product context. Answer general shopping questions about WAW marketplace.";

      if (product_id) {
        const { data: product } = await supabaseAdmin
          .from("products")
          .select("name, description, price, category:categories(name), store:stores(name)")
          .eq("id", product_id)
          .single();

        if (product) {
          productInfo = `Product: ${product.name}\nDescription: ${product.description || "N/A"}\nPrice: PKR ${product.price}\nCategory: ${(product.category as any)?.name || "N/A"}\nStore: ${(product.store as any)?.name || "N/A"}`;
        }
      }

      const response = await openRouterService.chatWithProductContext(query, productInfo, user?.id);
      res.json({ response });
    } catch (err: any) {
      if (err.message.includes("token limit")) {
        res.status(429).json({ error: err.message, code: "TOKEN_LIMIT_REACHED" });
        return;
      }
      logger.error("AI chat failed", { error: err.message });
      res.status(500).json({ error: "Failed to process your question" });
    }
  }

  // GET /api/ai/recommendations/:productId — free for all users
  static async getRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const { productId } = req.params;

      const { data: product } = await supabaseAdmin
        .from("products")
        .select("id, name, category_id, price")
        .eq("id", productId)
        .single();

      if (!product) {
        res.status(404).json({ error: "Product not found" });
        return;
      }

      // Get same-category products excluding current
      const { data: related } = await supabaseAdmin
        .from("products")
        .select("id, name, slug, price, images, avg_rating, review_count")
        .eq("category_id", product.category_id)
        .neq("id", productId)
        .eq("status", "active")
        .order("avg_rating", { ascending: false })
        .limit(8);

      res.json({ recommendations: related || [] });
    } catch (err: any) {
      logger.error("AI recommendations failed", { error: err.message });
      res.status(500).json({ error: "Failed to get recommendations" });
    }
  }

  // GET /api/ai/usage — admin only
  static async getUsage(req: Request, res: Response): Promise<void> {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data: usage } = await supabaseAdmin
        .from("ai_usage")
        .select("feature, total_tokens, prompt_tokens, completion_tokens, created_at, user_id")
        .gte("created_at", monthStart)
        .order("created_at", { ascending: false });

      const totalTokens = (usage || []).reduce((sum: number, row: any) => sum + (row.total_tokens || 0), 0);
      const byFeature = (usage || []).reduce((acc: Record<string, number>, row: any) => {
        acc[row.feature] = (acc[row.feature] || 0) + (row.total_tokens || 0);
        return acc;
      }, {});

      res.json({
        month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
        total_tokens: totalTokens,
        by_feature: byFeature,
        request_count: (usage || []).length,
        daily_limit: (await import("../../config/env.js")).ENV.OPENROUTER_DAILY_REQUEST_LIMIT,
      });
    } catch (err: any) {
      logger.error("AI usage fetch failed", { error: err.message });
      res.status(500).json({ error: "Failed to fetch AI usage" });
    }
  }
}
