import rateLimit from 'express-rate-limit';

/**
 * Global rate limiter: 100 requests / 15 minutes per IP
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_001',
      message: 'Too many requests. Please try again after 15 minutes.',
    },
  },
});

/**
 * Strict limiter for Auth routes: 10 requests / 15 minutes per IP
 * Prevents brute-force login and registration abuse.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_002',
      message: 'Too many auth attempts. Please try again after 15 minutes.',
    },
  },
});

/**
 * Booking limiter: 20 booking attempts / 15 minutes per IP
 */
export const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_003',
      message: 'Too many booking requests. Please slow down.',
    },
  },
});
