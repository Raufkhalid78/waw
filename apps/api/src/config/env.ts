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

  // WhatsApp / Twilio
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || "",
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || "",
  TWILIO_VERIFY_SERVICE_SID: process.env.TWILIO_VERIFY_SERVICE_SID || "",

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
}
