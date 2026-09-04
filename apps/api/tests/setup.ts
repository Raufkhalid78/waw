/**
 * Test bootstrap — sets safe mock environment variables before any
 * module imports. This prevents supabaseAdmin / redis / typesense
 * from crashing when no real .env file is present.
 *
 * MUST be imported before any application code via tsx --import.
 */

// Provide safe mock values for every required env var
process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://test.supabase.co";
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiJ9.test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiJ9.test-service-role-key";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-only-jwt-secret-minimum-32-chars-long";
process.env.POSTEX_API_TOKEN = process.env.POSTEX_API_TOKEN || "";
process.env.POSTEX_XPAY_TOKEN = process.env.POSTEX_XPAY_TOKEN || "";
process.env.POSTEX_XPAY_SECRET_KEY = process.env.POSTEX_XPAY_SECRET_KEY || "";
process.env.POSTEX_XPAY_MERCHANT_ID = process.env.POSTEX_XPAY_MERCHANT_ID || "";
process.env.TYPESENSE_API_KEY = process.env.TYPESENSE_API_KEY || "";
process.env.UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || "";
process.env.UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";
process.env.TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
process.env.TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
process.env.META_WHATSAPP_TOKEN = process.env.META_WHATSAPP_TOKEN || "";
process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
process.env.SENTRY_DSN = process.env.SENTRY_DSN || "";
process.env.RAAST_WEBHOOK_SECRET = process.env.RAAST_WEBHOOK_SECRET || "";

console.log("✅ Test bootstrap: mock environment variables loaded");
