// ============================================================================
// TRUF GAMING — Rate Limiter
// In-memory token-bucket rate limiter for API endpoint protection.
// Protects login, OTP, booking, and webhook endpoints from abuse.
// ============================================================================

interface RateLimitEntry {
  tokens: number
  lastRefill: number
}

const store = new Map<string, RateLimitEntry>()

interface RateLimitConfig {
  /** Maximum tokens (requests) in the bucket */
  maxTokens: number
  /** Refill rate: tokens added per second */
  refillRate: number
}

const PRESETS: Record<string, RateLimitConfig> = {
  login: { maxTokens: 10, refillRate: 0.5 }, // 10 attempts, refills 1 every 2s
  otp: { maxTokens: 5, refillRate: 0.1 }, // 5 attempts, refills 1 every 10s
  register: { maxTokens: 5, refillRate: 0.2 }, // 5 attempts, refills 1 every 5s
  booking: { maxTokens: 20, refillRate: 1 }, // 20 per second burst
  webhook: { maxTokens: 100, refillRate: 10 }, // High throughput for webhooks
  forgotPassword: { maxTokens: 3, refillRate: 0.05 }, // 3 attempts, refills 1 every 20s
  default: { maxTokens: 60, refillRate: 2 }, // General: 60 req/30s
}

/**
 * Check if a request is allowed under the rate limit.
 * @param key Unique identifier (e.g. IP address or `endpoint:ip`)
 * @param preset Which rate limit preset to use
 * @returns Whether the request is allowed
 */
export function checkRateLimit(
  key: string,
  preset: keyof typeof PRESETS = 'default'
): {
  allowed: boolean
  remaining: number
  retryAfterMs: number
} {
  const config: RateLimitConfig = (PRESETS[preset] ?? PRESETS.default)!
  const now = Date.now()

  let entry = store.get(key)
  if (!entry) {
    entry = { tokens: config!.maxTokens, lastRefill: now }
    store.set(key, entry)
  }

  // Refill tokens based on elapsed time
  const elapsed = (now - entry.lastRefill) / 1000
  entry.tokens = Math.min(config.maxTokens, entry.tokens + elapsed * config.refillRate)
  entry.lastRefill = now

  if (entry.tokens < 1) {
    const retryAfterMs = Math.ceil((1 - entry.tokens) / config.refillRate) * 1000
    return { allowed: false, remaining: 0, retryAfterMs }
  }

  entry.tokens -= 1
  return { allowed: true, remaining: Math.floor(entry.tokens), retryAfterMs: 0 }
}

/**
 * Middleware-style rate limit check for Next.js API routes.
 * Returns a Response if rate limited, or null if allowed.
 */
export function rateLimitGuard(
  req: Request,
  preset: keyof typeof PRESETS = 'default'
): Response | null {
  const ip =
    (req.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'

  const key = `${preset}:${ip}`
  const result = checkRateLimit(key, preset)

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
        },
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil(result.retryAfterMs / 1000)),
          'X-RateLimit-Remaining': String(result.remaining),
        },
      }
    )
  }

  return null
}

// Cleanup old entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      const cutoff = Date.now() - 10 * 60 * 1000 // Remove entries idle for >10 min
      for (const [key, entry] of store.entries()) {
        if (entry.lastRefill < cutoff) {
          store.delete(key)
        }
      }
    },
    5 * 60 * 1000
  )
}
