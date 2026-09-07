import { supabaseAdmin } from "../../config/supabase.js";
import { logger } from "../../config/logger.js";

interface MarketplaceConfig {
  [key: string]: string | number | boolean;
}

let configCache: MarketplaceConfig | null = null;
let configCacheExpiry = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetches marketplace configuration from the database with in-memory caching.
 * Replaces ALL hardcoded business rules, fees, URLs, phone numbers, etc.
 */
export class ConfigService {
  /**
   * Get a single config value by key.
   */
  static async get(key: string): Promise<string | null> {
    const config = await this.getAll();
    const val = config[key];
    return val !== undefined ? String(val) : null;
  }

  /**
   * Get a numeric config value by key with a fallback.
   */
  static async getNumber(key: string, fallback: number): Promise<number> {
    const val = await this.get(key);
    if (val === null) return fallback;
    const num = Number(val);
    return isNaN(num) ? fallback : num;
  }

  /**
   * Get all marketplace settings as a flat key-value object.
   * Cached in memory for 5 minutes.
   */
  static async getAll(): Promise<MarketplaceConfig> {
    const now = Date.now();
    if (configCache && now < configCacheExpiry) {
      return configCache;
    }

    try {
      const { data, error } = await supabaseAdmin
        .from("marketplace_settings")
        .select("key, value");

      if (error || !data) {
        logger.warn("Failed to fetch marketplace config", { error: error?.message });
        return configCache || {};
      }

      const config: MarketplaceConfig = {};
      for (const row of data) {
        // Try to parse as number, boolean, or keep as string
        const val = row.value;
        if (val === "true") config[row.key] = true;
        else if (val === "false") config[row.key] = false;
        else if (!isNaN(Number(val)) && val !== "") config[row.key] = Number(val);
        else config[row.key] = val;
      }

      configCache = config;
      configCacheExpiry = now + CACHE_TTL_MS;

      return config;
    } catch (err) {
      logger.warn("Failed to fetch marketplace config", { error: (err as Error).message });
      return configCache || {};
    }
  }

  /**
   * Invalidate the config cache (call after admin updates settings).
   */
  static invalidateCache(): void {
    configCache = null;
    configCacheExpiry = 0;
  }
}
