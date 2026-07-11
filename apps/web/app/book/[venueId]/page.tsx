import { redirect } from 'next/navigation'

/**
 * Redirect legacy /book/[venueId] URLs to /venues/[venueId]
 *
 * This page previously had a standalone booking wizard with hardcoded mock slots.
 * All bookings now go through the integrated Razorpay payment flow on the venue detail page.
 *
 * Kept as a redirect (not deleted) because:
 * - Google may have indexed these URLs
 * - Users may have bookmarked them
 * - QR codes or internal links may reference them
 *
 * Can be safely removed once traffic to this path drops to zero.
 */
export default async function LegacyBookPage({ params }: { params: Promise<{ venueId: string }> }) {
  const resolvedParams = await params
  redirect(`/venues/${resolvedParams.venueId}`)
}
