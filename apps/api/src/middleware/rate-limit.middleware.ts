import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { Redis } from 'ioredis';
import { ENV } from '../config/env.js';

// Setup ioredis client using the Upstash URL if available
const redisClient = ENV.UPSTASH_REDIS_REST_URL 
  ? new Redis(ENV.UPSTASH_REDIS_REST_URL.replace('https://', 'rediss://')) 
  : undefined;

/**
 * Strict rate limiter for WhatsApp OTP requests (5 requests per 15 minutes per IP/Phone)
 */
export const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 OTP requests per window
  standardHeaders: true,
  legacyHeaders: false,
  store: redisClient ? new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(args[0], ...args.slice(1)) as any,
    prefix: 'rl_otp:',
  }) : undefined,
  message: {
    error: 'Too many OTP requests from this IP. Please try again after 15 minutes.',
  },
});

/**
 * General API rate limiter (100 requests per minute)
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisClient ? new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(args[0], ...args.slice(1)) as any,
    prefix: 'rl_api:',
  }) : undefined,
  message: {
    error: 'Rate limit exceeded. Please slow down requests.',
  },
});
