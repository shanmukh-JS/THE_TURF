import { createAdminClient } from '@/lib/supabase/admin'
import { NotificationProvider, NotificationPayload, ProviderResponse } from './NotificationProvider'

export class InAppProvider implements NotificationProvider {
  async send(payload: NotificationPayload): Promise<ProviderResponse> {
    try {
      const supabase = createAdminClient()
      const { userId, type, templateName, variables, bookingId } = payload

      if (!userId) {
        return {
          success: false,
          error: 'In-app notification requires a userId',
          provider: 'in_app',
        }
      }

      const message = this.buildInAppMessage(templateName, variables)

      // Map template name to a user-friendly Title, Type, and Link
      let title = 'Notification'
      let mappedType = 'INFO'
      let link: string | null = null

      if (templateName.includes('confirm') || templateName.includes('book')) {
        title = 'Booking Confirmed'
        mappedType = 'BOOKING'
        link = '/player/bookings'
      } else if (templateName.includes('cancel')) {
        title = 'Booking Cancelled'
        mappedType = 'WARNING'
        link = '/player/bookings'
      } else if (templateName.includes('remind')) {
        title = 'Match Reminder'
        mappedType = 'INFO'
        link = '/player/bookings'
      } else if (templateName.includes('login')) {
        title = 'Security Alert'
        mappedType = 'WARNING'
      } else if (templateName.includes('rating') || templateName.includes('rate')) {
        title = 'Share Feedback'
        mappedType = 'SUCCESS'
      }

      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title,
          message,
          type: mappedType,
          is_read: false,
          link,
        })
        .select('id')
        .single()

      if (error) throw error

      return { success: true, messageId: data.id, provider: 'in_app' }
    } catch (e: any) {
      return { success: false, error: e.message, provider: 'in_app' }
    }
  }

  private buildInAppMessage(template: string, vars: Record<string, string>): string {
    const pName = vars.Player || vars.PlayerName || 'Gamer'
    const venue = vars.Venue || 'the Turf'
    const date = vars.Date || 'today'
    const time = vars.Time || ''
    const amount = vars.Amount || ''

    if (template.includes('login')) {
      return `Security Alert: Login detected from ${vars.City || 'Unknown Device'} at ${vars.Time || 'just now'}.`
    }
    if (template.includes('confirm') || template.includes('book')) {
      return `🏏 Booking Confirmed! Your slot at ${venue} is reserved for ${date} at ${time}. Enjoy your innings!`
    }
    if (template.includes('cancel')) {
      return `🚫 Booking Cancelled: Your reservation at ${venue} has been cancelled. Refund of ₹${amount} initiated.`
    }
    if (template.includes('remind')) {
      return `🏏 Match Reminder: Your game at ${venue} starts in 10 minutes. Please arrive early!`
    }
    if (template.includes('rating') || template.includes('rate')) {
      return `⭐ How was your game at ${venue}? Share your feedback and level up your player profile!`
    }

    return `Notification: Update regarding your booking at ${venue}.`
  }
}
