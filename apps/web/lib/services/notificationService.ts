// ============================================================================
// TRUF GAMING — Notification Provider System
// Abstract notification sender supporting Email, SMS, and Push.
// Follows the Strategy Pattern.
// ============================================================================

import { writeAuditLog, logger } from '@/lib/utils/logger'
import { sendEmail } from '@/lib/email/mailer'

export interface NotificationPayload {
  userId: string
  title: string
  message: string
  type: 'BOOKING_CONFIRMED' | 'BOOKING_CANCELLED' | 'PAYMENT_RECEIVED' | 'VENUE_APPROVED'
  channels: ('EMAIL' | 'SMS' | 'PUSH')[]
  metadata?: Record<string, unknown>
}

class NotificationService {
  /**
   * Dispatches a notification across specified channels.
   */
  async notify(payload: NotificationPayload): Promise<void> {
    try {
      // 1. Dispatch Email (Active)
      if (payload.channels.includes('EMAIL') && payload.metadata?.email) {
        // Send email based on type
        // This integrates with our existing email provider dynamically
        await sendEmail({
          to: payload.metadata.email as string,
          subject: payload.title,
          html: `<p>${payload.message}</p>`, // In full implementation, use templates[payload.type]
          templateName: payload.type,
        })
      }

      // 2. Dispatch SMS (Placeholder for future Twilio/MessageBird integration)
      if (payload.channels.includes('SMS') && payload.metadata?.phone) {
        logger.info(`[SMS] Sending to ${payload.metadata.phone}: ${payload.message}`)
      }

      // 3. Dispatch Push (Placeholder for Firebase Cloud Messaging / OneSignal)
      if (payload.channels.includes('PUSH')) {
        logger.info(`[PUSH] Sending to user ${payload.userId}: ${payload.title}`)
      }

      // 4. Write to audit log
      await writeAuditLog({
        actor_id: 'SYSTEM',
        module: 'SYSTEM',
        action: 'NOTIFICATION_SENT',
        target_id: payload.userId,
        new_value: { type: payload.type, channels: payload.channels },
      })
    } catch (error) {
      logger.error('Failed to dispatch notification:', error)
      await writeAuditLog({
        actor_id: 'SYSTEM',
        module: 'SYSTEM',
        action: 'NOTIFICATION_FAILED',
        target_id: payload.userId,
        new_value: {
          type: payload.type,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      })
    }
  }
}

export const notificationService = new NotificationService()
