import rateLimit from 'express-rate-limit';

/**
 * Strict rate limiter for WhatsApp OTP requests (5 requests per 15 minutes per IP/Phone)
 */
export const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 OTP requests per window
  standardHeaders: true,
  legacyHeaders: false,
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
  message: {
    error: 'Rate limit exceeded. Please slow down requests.',
  },
});
