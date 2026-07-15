import { globalEventBus } from '../EventBus'

/**
 * Dispatches the auth.login.v1 event to alert users of new sign-ins.
 */
export async function emitLoginEvent(params: {
  userId: string
  phone: string
  fullName: string
  city: string
  device: string
}) {
  return globalEventBus.publish({
    eventType: 'auth.login',
    version: 1,
    userId: params.userId,
    payload: {
      recipient: params.phone,
      templateName: 'auth_login_alert',
      variables: {
        PlayerName: params.fullName,
        Time: new Date().toLocaleTimeString(),
        Device: params.device,
        City: params.city,
      },
    },
  })
}

/**
 * Dispatches the booking.confirmed.v1 event upon verified payment.
 */
export async function emitBookingConfirmedEvent(params: {
  bookingId: string
  userId: string
  phone: string
  fullName: string
  venueName: string
  date: string
  time: string
  duration: string
  amount: string
  qrToken: string
  email: string
}) {
  // Use the new Unified Notification Service directly (bypassing legacy outbox)
  const { notificationService } = await import('@/lib/services/notifications/NotificationService')

  await notificationService.publishEvent('BOOKING_CONFIRMED', {
    bookingId: params.bookingId,
    userId: params.userId,
    recipient: params.phone,
    email: params.email,
    playerName: params.fullName,
    venueName: params.venueName,
    date: params.date,
    timeSlot: `${params.time} (${params.duration})`,
    amount: params.amount,
    qrToken: params.qrToken,
    mapsUrl: `https://maps.google.com/?q=${encodeURIComponent(params.venueName)}`,
  })

  // Optionally keep publishing to globalEventBus for other non-notification systems if needed,
  // but Notifications are now fully handled directly via BullMQ queue.
  return { success: true }
}

/**
 * Dispatches the booking.cancelled.v1 event when cancelled by owner or client.
 */
export async function emitBookingCancelledEvent(params: {
  bookingId: string
  userId: string
  phone: string
  fullName: string
  venueName: string
  amount: string
  reason: string
}) {
  // Use the new Unified Notification Service directly
  const { notificationService } = await import('@/lib/services/notifications/NotificationService')

  await notificationService.publishEvent('BOOKING_CANCELLED', {
    bookingId: params.bookingId,
    userId: params.userId,
    recipient: params.phone,
    playerName: params.fullName,
    venueName: params.venueName,
    amount: params.amount,
    reason: params.reason,
  })

  return { success: true }
}

/**
 * Dispatches the rating.request.v1 event with a 5-minute delayed schedule.
 */
export async function emitRatingRequestEvent(params: {
  bookingId: string
  userId: string
  phone: string
  venueName: string
  scheduledAt: string // ISO string 5 minutes in future
}) {
  return globalEventBus.publish({
    eventType: 'rating.request',
    version: 1,
    bookingId: params.bookingId,
    userId: params.userId,
    payload: {
      recipient: params.phone,
      templateName: 'rating_request',
      variables: {
        Venue: params.venueName,
        BookingId: params.bookingId,
      },
    },
  })
}
