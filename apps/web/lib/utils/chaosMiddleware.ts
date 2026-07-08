import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { logger } from './logger'

/**
 * Controlled Chaos Framework
 * Injects deliberate failures to test operational resilience and recovery.
 */
export function withChaos(req: NextRequest, res: NextResponse): NextResponse {
  if (process.env.NODE_ENV === 'production') {
    return res // Never allow in production
  }

  if (process.env.CHAOS_MODE !== 'true') {
    return res // Global kill switch
  }

  const chaosInjection = req.headers.get('x-chaos-injection')
  if (!chaosInjection) {
    return res
  }

  const chaosSecret = req.headers.get('x-chaos-secret')
  if (!chaosSecret || chaosSecret !== process.env.CHAOS_SECRET) {
    logger.warn('Unauthorized chaos injection attempt', { ip: req.headers.get('x-forwarded-for') })
    return res
  }

  logger.warn(`[CHAOS] Injecting fault: ${chaosInjection}`)

  switch (chaosInjection) {
    case 'redis_drop':
      // This signals the rest of the application that Redis is "offline"
      process.env.CHAOS_REDIS_OFFLINE = 'true'
      break
    case 'redis_timeout':
      process.env.CHAOS_REDIS_TIMEOUT = 'true'
      break
    case 'razorpay_500':
      process.env.CHAOS_RAZORPAY_FAIL = 'true'
      break
    case 'smtp_timeout':
      process.env.CHAOS_SMTP_TIMEOUT = 'true'
      break
    case 'slow_database':
      process.env.CHAOS_SLOW_DB = 'true'
      break
    case 'random_latency':
      // Block event loop or delay response
      const delay = Math.floor(Math.random() * 5000)
      const start = Date.now()
      while (Date.now() - start < delay) {
        // synchronous block
      }
      break
    default:
      logger.warn(`[CHAOS] Unknown injection type: ${chaosInjection}`)
  }

  return res
}
