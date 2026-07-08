import { revalidateTag } from 'next/cache'
import { logger } from './logger'

/**
 * Standardized Cache Invalidation keys for TRUF GAMING Next.js Data Cache.
 * Enforces predictable tag names across the application.
 */
export const CACHE_TAGS = {
  venues: 'venues',
  venueDetails: (venueId: string) => `venue-${venueId}`,
}

/**
 * Revalidates the public venue catalog (ISR)
 * Should be called when an owner changes pricing, updates images, or an admin approves a venue.
 */
export function invalidateVenuesCache() {
  try {
    // @ts-expect-error Next.js type definition expects 2 arguments in some versions
    revalidateTag(CACHE_TAGS.venues)
    logger.info('[Cache] Revalidated global venues list')
  } catch (err) {
    logger.error('[Cache] Failed to revalidate venues tag', { error: err })
  }
}

/**
 * Revalidates a specific venue's details page (ISR)
 */
export function invalidateVenueDetailsCache(venueId: string) {
  try {
    // @ts-expect-error Next.js type definition expects 2 arguments in some versions
    revalidateTag(CACHE_TAGS.venueDetails(venueId))
    logger.info(`[Cache] Revalidated venue details for ${venueId}`)
  } catch (err) {
    logger.error(`[Cache] Failed to revalidate venue details for ${venueId}`, { error: err })
  }
}
