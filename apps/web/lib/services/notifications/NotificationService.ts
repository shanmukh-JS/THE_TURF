import { notificationGateway } from './NotificationGateway'

export type NotificationEvent =
  | 'BOOKING_CONFIRMED'
  | 'NEW_BOOKING'
  | 'BOOKING_CANCELLED'
  | 'PAYMENT_SUCCESSFUL'
  | 'PAYMENT_FAILED'
  | 'BOOKING_EXPIRED'
  | 'BOOKING_REMINDER_10_MIN'
  | 'BOOKING_COMPLETED_REVIEW_PROMPT'

export interface EventPayload {
  bookingId?: string
  userId?: string
  ownerId?: string
  venueId?: string
  [key: string]: any
}

export class NotificationService {
  /**
   * Publishes a domain event. Maps it internally to the new NotificationGateway
   * routing system to maintain full backwards compatibility.
   */
  async publishEvent(event: NotificationEvent, payload: EventPayload): Promise<void> {
    const userId = payload.userId || payload.ownerId
    if (!userId) return

    let category = 'SYSTEM'
    let priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SILENT' = 'MEDIUM'
    let icon = 'Info'
    let color = 'bg-blue-500/10 text-blue-400'
    let title = event.replace(/_/g, ' ')

    if (event.includes('BOOKING')) {
      category = 'BOOKINGS'
      priority = 'HIGH'
      icon = 'CalendarCheck'
      color = 'bg-emerald-500/10 text-emerald-400'
    } else if (event.includes('PAYMENT')) {
      category = 'PAYMENTS'
      priority = 'HIGH'
      icon = 'CreditCard'
      color = 'bg-indigo-500/10 text-indigo-400'
    }

    await notificationGateway.dispatch('IN_APP', event, {
      userId,
      title,
      message: payload.message || '',
      category,
      priority,
      icon,
      color,
      metadata: payload,
    })
  }
}

export const notificationService = new NotificationService()
export default notificationService
