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
  return globalEventBus.publish({
    eventType: 'booking.confirmed',
    version: 1,
    bookingId: params.bookingId,
    userId: params.userId,
    payload: {
      recipient: params.phone,
      templateName: 'booking_confirm',
      variables: {
        Player: params.fullName,
        Venue: params.venueName,
        Date: params.date,
        Time: params.time,
        Duration: params.duration,
        BookingId: params.bookingId.substring(0, 8).toUpperCase(),
        Amount: params.amount,
        QrToken: params.qrToken,
        Email: params.email,
      },
    },
  })
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
  return globalEventBus.publish({
    eventType: 'booking.cancelled',
    version: 1,
    bookingId: params.bookingId,
    userId: params.userId,
    payload: {
      recipient: params.phone,
      templateName: 'booking_cancel',
      variables: {
        Player: params.fullName,
        Venue: params.venueName,
        Amount: params.amount,
        Reason: params.reason,
      },
    },
  })
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
