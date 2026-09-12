import dotenv from "dotenv";
dotenv.config();

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] || fallback;
  if (!value) {
    throw new Error(`FATAL: ${name} environment variable is required.`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue = ""): string {
  return process.env[name] || defaultValue;
}

// Lazy logger to avoid circular import at module load time
let _logger: any = null;
function getLogger() {
  if (!_logger) {
    try { _logger = require("./logger.js").logger; } catch {}
  }
  return _logger;
}

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "4000", 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",")
        .map((o) => o.trim())
        .filter(Boolean)
    : [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:4000",
        "https://www.waw.com.pk",
        "https://waw.com.pk",
      ],

  // Supabase Managed Auth & PostgreSQL
  SUPABASE_URL: optionalEnv("SUPABASE_URL"),
  SUPABASE_ANON_KEY: optionalEnv("SUPABASE_ANON_KEY"),
  SUPABASE_SERVICE_ROLE_KEY: optionalEnv("SUPABASE_SERVICE_ROLE_KEY"),
  SELLER_PORTAL_URL: process.env.SELLER_PORTAL_URL || "https://seller.waw.com.pk",

  // Security & JWT
  JWT_SECRET: optionalEnv("JWT_SECRET"),
  GUEST_TOKEN_SECRET: process.env.GUEST_TOKEN_SECRET || "",
  ALLOW_TEST_OTP: process.env.ALLOW_TEST_OTP === "true",

  // Redis for Queues & Concurrency Locks
  UPSTASH_REDIS_REST_URL: optionalEnv("UPSTASH_REDIS_REST_URL"),
  UPSTASH_REDIS_REST_TOKEN: optionalEnv("UPSTASH_REDIS_REST_TOKEN"),
  REDIS_HOST: process.env.REDIS_HOST || "localhost",
  REDIS_PORT: parseInt(process.env.REDIS_PORT || "6379", 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,
  REDIS_TLS: process.env.REDIS_TLS === "true",

  // Typesense Search
  TYPESENSE_HOST: process.env.TYPESENSE_HOST || "localhost",
  TYPESENSE_PORT: parseInt(process.env.TYPESENSE_PORT || "8108", 10),
  TYPESENSE_PROTOCOL: process.env.TYPESENSE_PROTOCOL || "http",
  TYPESENSE_API_KEY: optionalEnv("TYPESENSE_API_KEY"),

  // PostEx Unified Logistics & XPay Fintech Engine
  POSTEX_API_BASE:
    process.env.POSTEX_API_BASE ||
    "https://api.postex.pk/services/integration/api",
  POSTEX_API_TOKEN: optionalEnv("POSTEX_API_TOKEN"),
  // COD remittance polling: PostEx has no publicly documented remittance
  // endpoint — enable ONLY after route/contract is confirmed with PostEx.
  POSTEX_REMITTANCE_ENABLED: process.env.POSTEX_REMITTANCE_ENABLED === "true",
  // Firebase Cloud Messaging (push notifications) — HTTP v1 API with a
  // service account. Push is disabled unless all three are set.
  FCM_PROJECT_ID: optionalEnv("FCM_PROJECT_ID"),
  FCM_CLIENT_EMAIL: optionalEnv("FCM_CLIENT_EMAIL"),
  FCM_PRIVATE_KEY: optionalEnv("FCM_PRIVATE_KEY"),
  POSTEX_XPAY_BASE_URL:
    process.env.POSTEX_XPAY_BASE_URL || "https://xpay.postexglobal.com/api",
  POSTEX_XPAY_MERCHANT_ID: optionalEnv("POSTEX_XPAY_MERCHANT_ID"),
  POSTEX_XPAY_TOKEN: optionalEnv("POSTEX_XPAY_TOKEN"),
  POSTEX_XPAY_SECRET_KEY: optionalEnv("POSTEX_XPAY_SECRET_KEY"),

  // Bank Alfalah — Alfa Payment Gateway (APG)
  APG_ENV: (process.env.APG_ENV === "production" ? "production" : "sandbox"),
  APG_MERCHANT_ID: optionalEnv("APG_MERCHANT_ID"),
  APG_STORE_ID: optionalEnv("APG_STORE_ID"),
  APG_MERCHANT_USERNAME: optionalEnv("APG_MERCHANT_USERNAME"),
  APG_MERCHANT_PASSWORD: optionalEnv("APG_MERCHANT_PASSWORD"),
  APG_MERCHANT_HASH: optionalEnv("APG_MERCHANT_HASH"),
  // AES-128-CBC pair: Key1 = 16-char encryption key, Key2 = 16-char IV
  APG_KEY1: optionalEnv("APG_KEY1"),
  APG_KEY2: optionalEnv("APG_KEY2"),
  // Public base URL of THIS API server, used for provider webhooks and
  // buyer-facing return URLs. Must be set in production.
  PUBLIC_API_URL: optionalEnv("PUBLIC_API_URL"),

  // WhatsApp / Twilio (OTP)
  TWILIO_ACCOUNT_SID: optionalEnv("TWILIO_ACCOUNT_SID"),
  TWILIO_AUTH_TOKEN: optionalEnv("TWILIO_AUTH_TOKEN"),
  TWILIO_VERIFY_SERVICE_SID: optionalEnv("TWILIO_VERIFY_SERVICE_SID"),

  // Meta WhatsApp Cloud API (Transactional Notifications)
  META_WHATSAPP_TOKEN: optionalEnv("META_WHATSAPP_TOKEN"),
  META_WHATSAPP_PHONE_NUMBER_ID: optionalEnv("META_WHATSAPP_PHONE_NUMBER_ID"),

  // Raast P2M Configuration
  RAAST_MERCHANT_ALIAS: process.env.RAAST_MERCHANT_ALIAS || "waw.market@hbl",
  RAAST_MERCHANT_NAME:
    process.env.RAAST_MERCHANT_NAME || "Waw Online Shopping PK",
  RAAST_MERCHANT_CITY: process.env.RAAST_MERCHANT_CITY || "Lahore",
  RAAST_WEBHOOK_SECRET: optionalEnv("RAAST_WEBHOOK_SECRET"),

  // Marketplace Economics (PKR)
  FREE_DELIVERY_THRESHOLD_PKR: parseInt(
    process.env.FREE_DELIVERY_THRESHOLD_PKR || "5000",
    10,
  ),
  DEFAULT_COD_FEE_PKR: parseInt(process.env.DEFAULT_COD_FEE_PKR || "100", 10),
  BASE_SHIPPING_FEE_PKR: parseInt(
    process.env.BASE_SHIPPING_FEE_PKR || "200",
    10,
  ),
  DEFAULT_COMMISSION_PERCENTAGE: parseInt(
    process.env.DEFAULT_COMMISSION_PERCENTAGE || "10",
    10,
  ),

  // OpenRouter AI
  OPENROUTER_API_KEY: optionalEnv("OPENROUTER_API_KEY"),
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || "mistralai/mistral-7b-instruct",
  OPENROUTER_DAILY_REQUEST_LIMIT: parseInt(process.env.OPENROUTER_DAILY_REQUEST_LIMIT || "1000", 10),

  // Sentry Error Tracking
  SENTRY_DSN: optionalEnv("SENTRY_DSN"),
};

// Provider feature flags — derived from whether credentials are configured
export const FEATURES = {
  COURIER_ENABLED: Boolean(ENV.POSTEX_API_TOKEN),
  XPAY_ENABLED: Boolean(ENV.POSTEX_XPAY_TOKEN && ENV.POSTEX_XPAY_SECRET_KEY),
  APG_ENABLED: Boolean(
    ENV.APG_MERCHANT_ID && ENV.APG_STORE_ID && ENV.APG_MERCHANT_USERNAME &&
    ENV.APG_MERCHANT_PASSWORD && ENV.APG_MERCHANT_HASH && ENV.APG_KEY1 && ENV.APG_KEY2,
  ),
  SEARCH_ENABLED: Boolean(ENV.TYPESENSE_API_KEY),
  WHATSAPP_ENABLED: Boolean(ENV.META_WHATSAPP_TOKEN),
  OTP_ENABLED: Boolean(ENV.TWILIO_ACCOUNT_SID && ENV.TWILIO_AUTH_TOKEN),
  AI_ENABLED: Boolean(ENV.OPENROUTER_API_KEY),
  // Requires BOTH a PostEx token AND the explicit remittance opt-in — cash
  // confirmation must never be simulated by default.
  COD_REMITTANCE_POLLING: Boolean(ENV.POSTEX_API_TOKEN) && ENV.POSTEX_REMITTANCE_ENABLED,
};

if (ENV.NODE_ENV === "production") {
  const missing: string[] = [];

  if (!ENV.JWT_SECRET) missing.push("JWT_SECRET");
  if (!ENV.SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!ENV.SUPABASE_ANON_KEY) missing.push("SUPABASE_ANON_KEY");
  if (!ENV.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!ENV.UPSTASH_REDIS_REST_URL) missing.push("UPSTASH_REDIS_REST_URL");
  if (!ENV.UPSTASH_REDIS_REST_TOKEN) missing.push("UPSTASH_REDIS_REST_TOKEN");
  if (!process.env.REDIS_HOST) missing.push("REDIS_HOST");
  if (!process.env.REDIS_PORT) missing.push("REDIS_PORT");

  if (missing.length > 0) {
    throw new Error(
      `FATAL: Missing required production environment variables: ${missing.join(", ")}. ` +
      "Copy .env.example to .env and fill in real values before starting.",
    );
  }

  if (ENV.JWT_SECRET && ENV.JWT_SECRET.length < 32) {
    throw new Error("FATAL: JWT_SECRET must be at least 32 characters in production.");
  }

  if (ENV.RAAST_WEBHOOK_SECRET && ENV.RAAST_WEBHOOK_SECRET.length < 16) {
    throw new Error("FATAL: RAAST_WEBHOOK_SECRET must be at least 16 characters in production.");
  }

  const log = getLogger();
  const warn = (msg: string) => log ? log.warn(msg) : console.warn(msg);

  if (ENV.ALLOW_TEST_OTP) {
    throw new Error("FATAL: ALLOW_TEST_OTP=true is forbidden in production.");
  }

  if (ENV.PUBLIC_API_URL && !/^https:\/\//.test(ENV.PUBLIC_API_URL)) {
    throw new Error("FATAL: PUBLIC_API_URL must use https:// in production.");
  }

  if (!ENV.GUEST_TOKEN_SECRET) {
    warn("[SECURITY] GUEST_TOKEN_SECRET not set - guest checkout will be REJECTED at runtime.");
  }
  if (!ENV.PUBLIC_API_URL) {
    warn("[SECURITY] PUBLIC_API_URL not set - XPay payment webhooks cannot be delivered. Digital payments will never confirm.");
  }
  if (!FEATURES.COURIER_ENABLED) {
    warn("[SECURITY] POSTEX_API_TOKEN not set - courier booking is DISABLED.");
  }
  if (!FEATURES.XPAY_ENABLED) {
    warn("[SECURITY] XPay credentials not set - card/digital payments are DISABLED.");
  }
  if (!FEATURES.SEARCH_ENABLED) {
    warn("[SECURITY] TYPESENSE_API_KEY not set - search is DISABLED.");
  }
  if (!FEATURES.WHATSAPP_ENABLED) {
    warn("[SECURITY] META_WHATSAPP_TOKEN not set - WhatsApp notifications are DISABLED.");
  }
  if (!FEATURES.OTP_ENABLED) {
    warn("[SECURITY] Twilio credentials not set - OTP via SMS is DISABLED.");
  }
}
