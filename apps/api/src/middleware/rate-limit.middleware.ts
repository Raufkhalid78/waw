import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { Redis } from "ioredis";
import { ENV } from "../config/env.js";
import { logger } from "../config/logger.js";

// Setup ioredis client using dedicated TCP Redis credentials.
// NOTE: Upstash REST tokens are NOT Redis passwords — the rate limiter (like
// BullMQ) needs a real TCP endpoint (REDIS_HOST/PORT/PASSWORD). Upstash
// exposes one on the same dashboard ("Connect via Redis").
const redisClient =
  ENV.REDIS_HOST && ENV.REDIS_PORT
    ? new Redis({
        host: ENV.REDIS_HOST,
        port: ENV.REDIS_PORT,
        password: ENV.REDIS_PASSWORD,
        // Upstash and most managed providers terminate TLS on 6379
        tls: ENV.REDIS_TLS ? { rejectUnauthorized: true } : undefined,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      })
    : undefined;

if (redisClient) {
  redisClient.connect().catch((err) => {
    logger.warn(
      "⚠️ Rate limiter Redis connection error, will use in-memory fallback:",
      err.message,
    );
  });
}

const defaultKeyGenerator = (req: any) => req.ip || "unknown";

const isProduction = ENV.NODE_ENV === "production";

/**
 * Returns a RedisStore if Redis is configured, otherwise falls back to
 * express-rate-limit's in-memory store (per-instance limits). The in-memory
 * fallback is intentional: blocking ALL traffic because the shared store is
 * missing would take the entire API down, which is worse than per-instance
 * rate limiting. A loud warning is logged in production so the operator
 * knows limits are per-instance.
 */
let warnedNoRedis = false;
function getStore(prefix: string) {
  if (redisClient) {
    return new RedisStore({
      sendCommand: (...args: string[]) =>
        redisClient.call(args[0], ...args.slice(1)) as any,
      prefix,
    });
  }
  if (isProduction && !warnedNoRedis) {
    warnedNoRedis = true;
    logger.warn(
      "RATE LIMITER: TCP Redis is not configured — falling back to in-memory rate limiting (per-instance). Configure REDIS_HOST/REDIS_PORT/REDIS_PASSWORD (Upstash 'Connect via Redis' endpoint) for shared limits across instances.",
    );
  }
  return undefined;
}

/**
 * Strict rate limiter for WhatsApp OTP requests (5 requests per 15 minutes per IP/Phone)
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
 * Cart rate limiter (30 requests per minute per guest token or user)
 */
export const cartRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => {
    const guestToken = req.body?.guestToken || req.query?.guestToken || "";
    const userId = (req as any).user?.id || "";
    return guestToken || userId || defaultKeyGenerator(req);
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
 * Login rate limiter (10 attempts per 15 minutes per IP)
 * Prevents brute force attacks on authentication endpoints
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  // Degrade to pass-through (not 500) if the shared Redis store errors out.
  passOnStoreError: true,
  store: getStore("rl_login:"),
  message: {
    error:
      "Too many login attempts from this IP. Please try again after 15 minutes.",
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
    const phone = req.body?.phone || "";
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
