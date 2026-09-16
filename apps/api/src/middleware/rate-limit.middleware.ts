import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { redis as sharedRedis } from "../config/redis.js";
import { ENV } from "../config/env.js";
import { logger } from "../config/logger.js";

// Rate limiting store — same backing store as sessions/OTP/idempotency.
//
// The shared `redis` export in config/redis.ts is either the Upstash REST
// client (production/staging) or the in-memory fallback (dev/test). Both
// speak the same command surface (get/set/eval/del) that rate-limit-redis
// needs, so the limiter reuses it directly.
//
// NOTE: the previous implementation opened a SEPARATE ioredis TCP connection
// using REDIS_HOST/REDIS_PORT + REDIS_PASSWORD. For Upstash deployments the
// REST token is NOT a TCP password, so that connection could never
// authenticate: it stayed in a failed state and made EVERY rate-limited
// request throw "Stream isn't writeable and enableOfflineQueue options is
// false" (HTTP 500) — the cart routes were hard-down in production because
// of it.
const rateLimitRedis: any = sharedRedis;

const defaultKeyGenerator = (req: any) => req.ip || "unknown";

const isProduction = ENV.NODE_ENV === "production";

/**
 * Returns a RedisStore backed by the shared Upstash REST client (production/
 * staging), or undefined to let express-rate-limit use its built-in
 * per-instance memory store (dev/test). Blocking ALL traffic because the
 * shared store is missing would take the entire API down, which is worse
 * than per-instance rate limiting.
 *
 * rate-limit-redis v6 issues raw RESP commands:
 *   SCRIPT LOAD <lua>          → returns the script's SHA1
 *   EVALSHA <sha> 1 <key> ...  → run script; throws NOSCRIPT if not cached
 * The Upstash REST client exposes these as scriptLoad()/evalsha(), so we
 * translate command-by-command. This replaces a previous implementation
 * that opened a SEPARATE ioredis TCP connection using the Upstash REST
 * token as a password — it could never authenticate, stayed in a failed
 * state, and made every rate-limited request throw "Stream isn't
 * writeable" (HTTP 500). The cart routes were hard-down in production
 * because of it.
 */
const isUpstashRestClient = (c: any): boolean =>
  typeof c?.scriptLoad === "function" && typeof c?.evalsha === "function";

let warnedNotShared = false;
function getStore(prefix: string) {
  if (!isUpstashRestClient(rateLimitRedis)) {
    if (isProduction && !warnedNotShared) {
      warnedNotShared = true;
      logger.warn(
        "RATE LIMITER: shared Upstash Redis not configured — falling back to per-instance in-memory rate limiting.",
      );
    }
    // Dev/test memory fallback → express-rate-limit's built-in store is
    // the same thing, but battle-tested. No emulation needed.
    return undefined;
  }

  return new RedisStore({
    sendCommand: (...commandParts: unknown[]) => {
      const parts = commandParts as (string | number)[];
      const cmd = String(parts[0]).toUpperCase();
      const args = parts.slice(1);

      switch (cmd) {
        case "SCRIPT":
          // ["SCRIPT", "LOAD", <lua>] → scriptLoad(lua)
          return rateLimitRedis.scriptLoad(String(args[1]));
        case "EVALSHA": {
          // ["EVALSHA", sha, numkeys, key, ...rest] → evalsha(sha, [keys], [args])
          const sha = String(args[0]);
          const keyCount = parseInt(String(args[1]), 10) || 1;
          const keys = args.slice(2, 2 + keyCount).map(String);
          const evalArgs = args.slice(2 + keyCount).map(String);
          return rateLimitRedis.evalsha(sha, keys, evalArgs);
        }
        case "EVAL": {
          // ["EVAL", lua, numkeys, key, ...rest] → eval(lua, [keys], [args])
          const lua = String(args[0]);
          const keyCount = parseInt(String(args[1]), 10) || 1;
          const keys = args.slice(2, 2 + keyCount).map(String);
          const evalArgs = args.slice(2 + keyCount).map(String);
          return rateLimitRedis.eval(lua, keys, evalArgs);
        }
        default:
          return Promise.reject(
            new Error(`rate limiter: unsupported redis command ${parts[0]}`),
          );
      }
    },
    prefix,
  });
}

/**
 * Strict rate limiter for WhatsApp OTP requests (5 requests per 15 minutes per IP)
 */
export const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  // Degrade to pass-through (not 500) if the shared Redis store errors out.
  passOnStoreError: true,
  store: getStore("rl_otp:"),
  message: {
    error:
      "Too many OTP requests from this IP. Please try again after 15 minutes.",
  },
});

/**
 * Per-destination-phone OTP send cap (3 per hour per normalized phone).
 * The IP-keyed otpRateLimiter above can't stop a rotating-IP attacker from
 * SMS-bombing one victim number — each send also silently replaces the
 * victim's in-flight OTP, locking them out of login.
 */
export const otpPhoneRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => {
    let phone: string = req.body?.phone || "";
    phone = phone.replace(/[\s-]/g, "");
    if (/^0\d{9,12}$/.test(phone)) phone = `+92${phone.replace(/^0+/, "")}`;
    else if (/^\d{9,12}$/.test(phone)) phone = `+92${phone}`;
    return `phone:${phone || "none"}`;
  },
  passOnStoreError: true,
  store: getStore("rl_otp_phone:"),
  message: {
    error:
      "Too many OTP requests for this phone number. Please try again after an hour.",
  },
});

/**
 * General API rate limiter (120 requests per minute)
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  // Degrade to pass-through (not 500) if the shared Redis store errors out.
  passOnStoreError: true,
  store: getStore("rl_api:"),
  message: {
    error: "Rate limit exceeded. Please slow down requests.",
  },
});

/**
 * Cart rate limiter (30 requests per minute per user or IP)
 * NOTE: the key deliberately EXCLUDES the client-supplied guestToken — an
 * attacker could mint a fresh random token per request to get a fresh bucket.
 * Keying on session user or IP keeps the limit unspoofable.
 */
export const cartRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => {
    const userId = (req as any).user?.id || "";
    return userId || defaultKeyGenerator(req);
  },
  store: getStore("rl_cart:"),
  message: {
    error: "Too many cart requests. Please slow down.",
  },
});

/**
 * Order creation rate limiter (5 orders per minute per user)
 */
export const orderRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => (req as any).user?.id || defaultKeyGenerator(req),
  store: getStore("rl_order:"),
  message: { error: "Too many order attempts. Please wait before trying again." },
});

/**
 * Review rate limiter (3 reviews per minute per user)
 */
export const reviewRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => (req as any).user?.id || defaultKeyGenerator(req),
  store: getStore("rl_review:"),
  message: { error: "Too many review submissions. Please slow down." },
});

/**
 * Wishlist rate limiter (10 requests per minute per user)
 */
export const wishlistRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => (req as any).user?.id || defaultKeyGenerator(req),
  store: getStore("rl_wishlist:"),
  message: { error: "Too many wishlist requests. Please slow down." },
});

/**
 * Login rate limiter (10 attempts per 15 minutes per email+IP)
 * Prevents brute force attacks on authentication endpoints.
 * Keyed on email+IP: behind the Next.js proxies every request arrives from
 * the proxy's IP, so an IP-only key let one attacker lock out ALL admins
 * (shared bucket). The composite key isolates each attacker to their own.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  // Degrade to pass-through (not 500) if the shared Redis store errors out.
  passOnStoreError: true,
  keyGenerator: (req) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    return email ? `${defaultKeyGenerator(req)}:${email}` : defaultKeyGenerator(req);
  },
  store: getStore("rl_login:"),
  message: {
    error:
      "Too many login attempts. Please try again after 15 minutes.",
  },
});

/**
 * OTP verification rate limiter (5 attempts per 5 minutes per phone)
 * Prevents OTP brute force attacks
 */
export const otpVerifyRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => {
    // Normalize the phone exactly like auth.service.ts does before hitting
    // Redis: +92XXXXXXXXXX. Keying on the raw body let attackers bypass the
    // per-phone limit by alternating "0300…", "+9230…", "9230…" formats —
    // three buckets for one OTP key.
    let phone: string = req.body?.phone || "";
    phone = phone.replace(/[\s-]/g, "");
    if (/^0\d{9,12}$/.test(phone)) phone = `+92${phone.replace(/^0+/, "")}`;
    else if (/^\d{9,12}$/.test(phone)) phone = `+92${phone}`;
    return phone || defaultKeyGenerator(req);
  },
  store: getStore("rl_otp_verify:"),
  message: {
    error:
      "Too many OTP verification attempts. Please request a new code.",
  },
});

/**
 * Support ticket rate limiter (3 tickets per 10 minutes per user)
 */
export const supportRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => (req as any).user?.id || defaultKeyGenerator(req),
  // Degrade to pass-through (not 500) if the shared Redis store errors out.
  passOnStoreError: true,
  store: getStore("rl_support:"),
  message: { error: "Too many support tickets. Please wait before creating another." },
});

/**
 * Payment initiation rate limiter (10 per minute per user).
 * Each hit is a paid-provider API call — must be throttled harder than the
 * global limiter to prevent cost-abuse.
 */
export const paymentRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => (req as any).user?.id || defaultKeyGenerator(req),
  // Degrade to pass-through (not 500) if the shared Redis store errors out.
  passOnStoreError: true,
  store: getStore("rl_payment:"),
  message: { error: "Too many payment attempts. Please wait before trying again." },
});

/**
 * Order lookup limiter (10 per 10 minutes per IP). Unauthenticated endpoint —
 * order-number probing must be expensive.
 */
export const lookupRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  // Degrade to pass-through (not 500) if the shared Redis store errors out.
  passOnStoreError: true,
  store: getStore("rl_lookup:"),
  message: { error: "Too many lookups. Please try again later." },
});

/**
 * MFA endpoint limiter (5 attempts per 5 minutes per user).
 * TOTP codes are 6 digits — without this they are brute-forceable.
 */
export const mfaRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => (req as any).user?.id || defaultKeyGenerator(req),
  // Degrade to pass-through (not 500) if the shared Redis store errors out.
  passOnStoreError: true,
  store: getStore("rl_mfa:"),
  message: { error: "Too many MFA attempts. Please try again in a few minutes." },
});
