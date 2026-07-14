// ============================================================================
// TRUF GAMING — Rate Limiter
// Atomic token-bucket rate limiter for API endpoint protection using Supabase.
// Protects login, OTP, booking, and webhook endpoints from abuse.
// ============================================================================

import { createAdminClient } from './../supabase/admin'

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
export async function checkRateLimit(
  key: string,
  preset: keyof typeof PRESETS = 'default'
): Promise<{
  allowed: boolean
  remaining: number
  retryAfterMs: number
}> {
  const config: RateLimitConfig = (PRESETS[preset] ?? PRESETS.default)!

  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_key: key,
    p_max_tokens: config.maxTokens,
    p_refill_rate: config.refillRate,
  })

  if (error || !data) {
    console.error('Rate limit RPC error:', error)
    // Fail open or fail closed? Usually fail closed for rate limiting, but failing open prevents downtime. Let's fail open but log.
    return { allowed: true, remaining: 1, retryAfterMs: 0 }
  }

  return data as { allowed: boolean; remaining: number; retryAfterMs: number }
}

/**
 * Middleware-style rate limit check for Next.js API routes.
 * Returns a Response if rate limited, or null if allowed.
 */
export async function rateLimitGuard(
  req: Request,
  preset: keyof typeof PRESETS = 'default'
): Promise<Response | null> {
  const ip =
    (req.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'

  const key = `${preset}:${ip}`
  const result = await checkRateLimit(key, preset)

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
