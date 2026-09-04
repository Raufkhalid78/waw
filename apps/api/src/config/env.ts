import dotenv from "dotenv";
dotenv.config();

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
  SUPABASE_URL: process.env.SUPABASE_URL || "https://placeholder.supabase.co",
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "placeholder_anon_key",
  SUPABASE_SERVICE_ROLE_KEY:
    process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder_service_key",

  // Security & JWT
  JWT_SECRET:
    process.env.JWT_SECRET || "waw_sec_jwt_signing_key_2026_pk_enterprise",
  ALLOW_TEST_OTP: process.env.ALLOW_TEST_OTP === "true",

  // Redis for Queues & Concurrency Locks
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || "",
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || "",
  REDIS_HOST: process.env.REDIS_HOST || "localhost",
  REDIS_PORT: parseInt(process.env.REDIS_PORT || "6379", 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,

  // Typesense Search
  TYPESENSE_HOST: process.env.TYPESENSE_HOST || "localhost",
  TYPESENSE_PORT: parseInt(process.env.TYPESENSE_PORT || "8108", 10),
  TYPESENSE_PROTOCOL: process.env.TYPESENSE_PROTOCOL || "http",
  TYPESENSE_API_KEY:
    process.env.TYPESENSE_API_KEY || "xyz123WawTypesenseSecretKey2026",

  // PostEx Unified Logistics & XPay Fintech Engine
  POSTEX_API_BASE:
    process.env.POSTEX_API_BASE ||
    "https://api.postex.pk/services/integration/api",
  POSTEX_API_TOKEN: process.env.POSTEX_API_TOKEN || "ptx_live_test_token_2026",
  POSTEX_XPAY_BASE_URL:
    process.env.POSTEX_XPAY_BASE_URL || "https://xpay.postexglobal.com/api",
  POSTEX_XPAY_MERCHANT_ID:
    process.env.POSTEX_XPAY_MERCHANT_ID || "WAW-POSTEX-001",
  POSTEX_XPAY_TOKEN:
    process.env.POSTEX_XPAY_TOKEN || "xpay_live_test_token_2026",
  POSTEX_XPAY_SECRET_KEY:
    process.env.POSTEX_XPAY_SECRET_KEY || "xpay_sec_test_secret_key_2026",

  // WhatsApp / Twilio (OTP)
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || "",
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || "",
  TWILIO_VERIFY_SERVICE_SID: process.env.TWILIO_VERIFY_SERVICE_SID || "",

  // Meta WhatsApp Cloud API (Transactional Notifications)
  META_WHATSAPP_TOKEN: process.env.META_WHATSAPP_TOKEN || "",
  META_WHATSAPP_PHONE_NUMBER_ID:
    process.env.META_WHATSAPP_PHONE_NUMBER_ID || "",

  // Raast P2M Configuration
  RAAST_MERCHANT_ALIAS: process.env.RAAST_MERCHANT_ALIAS || "waw.market@hbl",
  RAAST_MERCHANT_NAME:
    process.env.RAAST_MERCHANT_NAME || "Waw Online Shopping PK",
  RAAST_MERCHANT_CITY: process.env.RAAST_MERCHANT_CITY || "Lahore",
  RAAST_WEBHOOK_SECRET: process.env.RAAST_WEBHOOK_SECRET || "",

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
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "",
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || "mistralai/mistral-7b-instruct",
  OPENROUTER_DAILY_REQUEST_LIMIT: parseInt(process.env.OPENROUTER_DAILY_REQUEST_LIMIT || "1000", 10),

  // Sentry Error Tracking
  SENTRY_DSN: process.env.SENTRY_DSN || "",
};

if (ENV.NODE_ENV === "production") {
  if (
    ENV.JWT_SECRET === "waw_sec_jwt_signing_key_2026_pk_enterprise" ||
    !process.env.JWT_SECRET
  ) {
    throw new Error(
      "FATAL: A custom JWT_SECRET environment variable is required in production mode. Using the default key is a critical security vulnerability.",
    );
  }

  if (!ENV.UPSTASH_REDIS_REST_URL || !ENV.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error(
      "FATAL: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production mode for reliable OTP and concurrency locking.",
    );
  }

  if (ENV.SUPABASE_URL === "https://placeholder.supabase.co" || !process.env.SUPABASE_URL) {
    throw new Error(
      "FATAL: SUPABASE_URL is required in production mode.",
    );
  }

  if (ENV.SUPABASE_SERVICE_ROLE_KEY === "placeholder_service_key" || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "FATAL: SUPABASE_SERVICE_ROLE_KEY is required in production mode.",
    );
  }

  // PostEx logistics — optional, warn instead of throw
  if (ENV.POSTEX_API_TOKEN === "ptx_live_test_token_2026" || !process.env.POSTEX_API_TOKEN) {
    console.warn("⚠️  POSTEX_API_TOKEN not set — courier booking will be disabled.");
  }

  // XPay payments — optional, warn instead of throw
  if (ENV.POSTEX_XPAY_TOKEN === "xpay_live_test_token_2026" || !process.env.POSTEX_XPAY_TOKEN) {
    console.warn("⚠️  POSTEX_XPAY_TOKEN not set — XPay card payments will be disabled.");
  }

  if (ENV.POSTEX_XPAY_SECRET_KEY === "xpay_sec_test_secret_key_2026" || !process.env.POSTEX_XPAY_SECRET_KEY) {
    console.warn("⚠️  POSTEX_XPAY_SECRET_KEY not set — XPay webhook verification will be disabled.");
  }

  if (ENV.RAAST_WEBHOOK_SECRET && ENV.RAAST_WEBHOOK_SECRET.length < 16) {
    throw new Error("FATAL: RAAST_WEBHOOK_SECRET must be at least 16 characters in production.");
  }

  if (ENV.TYPESENSE_API_KEY === "xyz123WawTypesenseSecretKey2026" || !process.env.TYPESENSE_API_KEY) {
    console.warn("⚠️  TYPESENSE_API_KEY not set — search functionality will be disabled.");
  }
}
