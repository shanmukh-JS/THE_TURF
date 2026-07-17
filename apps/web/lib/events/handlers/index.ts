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
 * Notifies BOTH the player AND the venue owner.
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
  ownerId?: string
  ownerEmail?: string
}) {
  const { notificationService } = await import('@/lib/services/notifications/NotificationService')

  // Dispatch to Player
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

  // Dispatch to Owner
  if (params.ownerId) {
    await notificationService.publishEvent('NEW_BOOKING', {
      bookingId: params.bookingId,
      userId: params.ownerId,
      email: params.ownerEmail || '',
      playerName: params.fullName,
      venueName: params.venueName,
      date: params.date,
      timeSlot: `${params.time} (${params.duration})`,
      amount: params.amount,
    })
  }

  return { success: true }
}

/**
 * Dispatches the booking.cancelled.v1 event.
 * Notifies the player and optionally the owner.
 */
export async function emitBookingCancelledEvent(params: {
  bookingId: string
  userId: string
  phone: string
  fullName: string
  venueName: string
  amount: string
  reason: string
  ownerId?: string
}) {
  const { notificationService } = await import('@/lib/services/notifications/NotificationService')

  // Player notification
  await notificationService.publishEvent('BOOKING_CANCELLED', {
    bookingId: params.bookingId,
    userId: params.userId,
    recipient: params.phone,
    playerName: params.fullName,
    venueName: params.venueName,
    amount: params.amount,
    reason: params.reason,
  })

  // Owner notification
  if (params.ownerId) {
    await notificationService.publishEvent('BOOKING_CANCELLED', {
      bookingId: params.bookingId,
      userId: params.ownerId,
      venueName: params.venueName,
      playerName: params.fullName,
      amount: params.amount,
      reason: params.reason,
    })
  }

  // Also publish to the global event bus for outbox-based downstream consumers
  await globalEventBus.publish({
    eventType: 'booking.cancel.completed',
    version: 1,
    bookingId: params.bookingId,
    userId: params.userId,
    payload: { amount: params.amount, reason: params.reason },
  })

  return { success: true }
}

export async function emitBookingCancelRequestedEvent(params: {
  bookingId: string
  userId: string
  correlationId: string
  payload: any
}) {
  return globalEventBus.publish({
    eventType: 'booking.cancel.requested',
    version: 1,
    bookingId: params.bookingId,
    userId: params.userId,
    payload: { ...params.payload, correlationId: params.correlationId },
  })
}

export async function emitRefundRequestedEvent(params: {
  refundId: string
  bookingId: string
  userId: string
  amount: number
  correlationId: string
}) {
  return globalEventBus.publish({
    eventType: 'refund.requested',
    version: 1,
    bookingId: params.bookingId,
    userId: params.userId,
    payload: {
      refundId: params.refundId,
      amount: params.amount,
      correlationId: params.correlationId,
    },
  })
}

export async function emitRefundProcessingEvent(params: {
  refundId: string
  bookingId: string
  userId: string
  amount: number
  correlationId: string
}) {
  return globalEventBus.publish({
    eventType: 'refund.processing',
    version: 1,
    bookingId: params.bookingId,
    userId: params.userId,
    payload: {
      refundId: params.refundId,
      amount: params.amount,
      correlationId: params.correlationId,
    },
  })
}

/**
 * Dispatches the refund.completed event.
 * Notifies the player via the unified notification service.
 */
export async function emitRefundCompletedEvent(params: {
  refundId: string
  bookingId: string
  userId: string
  amount: number
  correlationId: string
}) {
  const { notificationService } = await import('@/lib/services/notifications/NotificationService')

  // Player refund notification
  await notificationService.publishEvent('REFUND_COMPLETED', {
    bookingId: params.bookingId,
    userId: params.userId,
    amount: params.amount.toString(),
    reference: params.refundId,
  })

  // Also publish to outbox for downstream consumers
  return globalEventBus.publish({
    eventType: 'refund.completed',
    version: 1,
    bookingId: params.bookingId,
    userId: params.userId,
    payload: {
      refundId: params.refundId,
      amount: params.amount,
      correlationId: params.correlationId,
    },
  })
}

export async function emitRefundFailedEvent(params: {
  refundId: string
  bookingId: string
  userId: string
  error: string
  correlationId: string
}) {
  const { notificationService } = await import('@/lib/services/notifications/NotificationService')

  // Player refund failure notification
  await notificationService.publishEvent('REFUND_FAILED', {
    bookingId: params.bookingId,
    userId: params.userId,
    error: params.error,
  })

  return globalEventBus.publish({
    eventType: 'refund.failed',
    version: 1,
    bookingId: params.bookingId,
    userId: params.userId,
    payload: {
      refundId: params.refundId,
      error: params.error,
      correlationId: params.correlationId,
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

/**
 * Dispatches settlement completed notification to venue owner.
 */
export async function emitSettlementCompletedEvent(params: {
  ownerId: string
  amount: number
  settlementId: string
}) {
  const { notificationService } = await import('@/lib/services/notifications/NotificationService')

  await notificationService.publishEvent('SETTLEMENT_COMPLETED', {
    userId: params.ownerId,
    amount: params.amount.toString(),
    settlementId: params.settlementId,
  })
}

/**
 * Dispatches low-rating alert notification to venue owner.
 */
export async function emitLowRatingAlertEvent(params: {
  ownerId: string
  venueName: string
  averageRating: number
}) {
  const { notificationService } = await import('@/lib/services/notifications/NotificationService')

  await notificationService.publishEvent('LOW_RATING_ALERT', {
    userId: params.ownerId,
    venueName: params.venueName,
    averageRating: params.averageRating.toString(),
  })
}
