import { ENV } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { supabaseAdmin } from "../../config/supabase.js";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenRouterResponse {
  choices: { message: { content: string } }[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export class OpenRouterService {
  private apiKey: string;
  private model: string;
  private dailyRequestLimit: number;
  private baseUrl = "https://openrouter.ai/api/v1";

  constructor() {
    this.apiKey = ENV.OPENROUTER_API_KEY;
    this.model = ENV.OPENROUTER_MODEL;
    this.dailyRequestLimit = ENV.OPENROUTER_DAILY_REQUEST_LIMIT;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://waw.com.pk",
      "X-Title": "WAW Marketplace",
    };
  }

  private async getTodayRequestCount(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.toISOString();

    const { count, error } = await supabaseAdmin
      .from("ai_usage")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart);

    if (error) {
      logger.error("Failed to check AI daily usage", { error: error.message });
      return 0;
    }
    return count || 0;
  }

  private async recordUsage(userId: string | null, feature: string, promptTokens: number, completionTokens: number): Promise<void> {
    const { error } = await supabaseAdmin.from("ai_usage").insert({
      user_id: userId,
      feature,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
      model: this.model,
    });

    if (error) {
      logger.error("Failed to record AI usage", { error: error.message });
    }
  }

  async chat(
    messages: ChatMessage[],
    options?: { model?: string; maxTokens?: number; temperature?: number; userId?: string; feature?: string },
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    const todayCount = await this.getTodayRequestCount();
    if (todayCount >= this.dailyRequestLimit) {
      logger.warn("OpenRouter daily request limit reached", { todayCount, limit: this.dailyRequestLimit });
      throw new Error("AI daily request limit reached. Please try again tomorrow.");
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: options?.model || this.model,
        messages,
        max_tokens: options?.maxTokens || 1024,
        temperature: options?.temperature ?? 0.7,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      logger.error("OpenRouter API error", { status: res.status, body });
      throw new Error(`OpenRouter API error: ${res.status}`);
    }

    const data: OpenRouterResponse = await res.json();
    const content = data.choices[0]?.message?.content || "";

    if (data.usage) {
      await this.recordUsage(
        options?.userId || null,
        options?.feature || "unknown",
        data.usage.prompt_tokens,
        data.usage.completion_tokens,
      );
    }

    return content;
  }

  async generateProductDescription(
    productName: string,
    category: string,
    attributes: Record<string, string>,
    userId?: string,
  ): Promise<string> {
    const attrList = Object.entries(attributes)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join("\n");

    const messages: ChatMessage[] = [
      {
        role: "system",
        content: "You are a product copywriter for WAW, a Pakistani e-commerce marketplace. Write compelling, SEO-friendly product descriptions in English. Be concise (100-150 words), highlight key features, and include a call to action. Use plain text only — no markdown, no bullet symbols, no special characters.",
      },
      {
        role: "user",
        content: `Write a product description for:\n\nProduct: ${productName}\nCategory: ${category}\nAttributes:\n${attrList}`,
      },
    ];

    return this.chat(messages, { maxTokens: 300, temperature: 0.7, userId, feature: "description_generator" });
  }

  async chatWithProductContext(query: string, productInfo: string, userId?: string): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: "You are WAW's shopping assistant. Answer questions about products helpfully and concisely. Be friendly and guide the customer. If you don't know something, say so honestly.",
      },
      {
        role: "user",
        content: `Product information:\n${productInfo}\n\nCustomer question: ${query}`,
      },
    ];

    return this.chat(messages, { maxTokens: 512, temperature: 0.5, userId, feature: "chatbot" });
  }
}

export const openRouterService = new OpenRouterService();
