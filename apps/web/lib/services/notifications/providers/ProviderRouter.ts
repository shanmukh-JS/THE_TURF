import { NotificationProvider, NotificationPayload, ProviderResponse } from './NotificationProvider'
import { WhatsAppProvider } from './WhatsAppProvider'
import { TwilioProvider } from './TwilioProvider'
import { InAppProvider } from './InAppProvider'
import { EmailProvider } from './EmailProvider'
import { createAdminClient } from '@/lib/supabase/admin'

export class ProviderRouter implements NotificationProvider {
  private whatsappProvider = new WhatsAppProvider()
  private twilioProvider = new TwilioProvider()
  private inAppProvider = new InAppProvider()
  private emailProvider = new EmailProvider()

  async send(payload: NotificationPayload): Promise<ProviderResponse> {
    const supabase = createAdminClient()

    // 1. Always deliver in-app notifications if user is logged in
    if (payload.userId) {
      try {
        await this.inAppProvider.send(payload)
      } catch (err: any) {
        console.error(
          'In-app notification delivery failed (ignoring to prevent flow break):',
          err.message
        )
      }
    }

    // 2. Fetch User Notification Preferences
    let whatsappEnabled = true
    let smsEnabled = false

    if (payload.userId) {
      const { data: prefs } = await supabase
        .from('user_notification_preferences')
        .select('whatsapp_enabled, sms_enabled')
        .eq('user_id', payload.userId)
        .maybeSingle()

      if (prefs) {
        whatsappEnabled = prefs.whatsapp_enabled
        smsEnabled = prefs.sms_enabled
      }
    }

    // 3. Deliver via WhatsApp (if enabled)
    if (whatsappEnabled) {
      const response = await this.whatsappProvider.send(payload)
      if (response.success) {
        return response
      }

      // If WhatsApp failed, write failover log
      console.warn(
        `WhatsApp delivery failed for ${payload.recipient}. Routing to Twilio SMS failover...`
      )
      await supabase.from('notification_logs').insert({
        action: 'WHATSAPP_FAILOVER_TRIGGERED',
        error_stack: response.error || 'WhatsApp Provider returned failed state',
        request_payload: payload,
      })
    }

    // 4. Fallback to Twilio SMS (if enabled or if WhatsApp failed)
    let smsResponse
    if (smsEnabled || (!whatsappEnabled && payload.recipient)) {
      smsResponse = await this.twilioProvider.send(payload)
    }

    // 5. Always send Email if an email address is provided in variables
    let emailResponse
    if (payload.variables && payload.variables.Email) {
      try {
        emailResponse = await this.emailProvider.send(payload)
      } catch (err: any) {
        console.error('Email delivery failed:', err.message)
      }
    }

    return smsResponse || emailResponse || { success: true, provider: 'none_sent' }
  }
}

export const providerRouter = new ProviderRouter()
export default providerRouter
