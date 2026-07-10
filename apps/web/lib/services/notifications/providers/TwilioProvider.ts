import { NotificationProvider, NotificationPayload, ProviderResponse } from './NotificationProvider'

export class TwilioProvider implements NotificationProvider {
  async send(payload: NotificationPayload): Promise<ProviderResponse> {
    const twilioSid = process.env.TWILIO_ACCOUNT_SID
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN
    const twilioNumber = process.env.TWILIO_PHONE_NUMBER

    const { recipient, templateName, variables } = payload

    try {
      const smsBody = this.buildSmsText(templateName, variables)

      if (!twilioSid || !twilioAuthToken || !twilioNumber) {
        console.log('--------------------------------------------------')
        console.log(`[Twilio SMS DEV MODE] Sending to: ${recipient}`)
        console.log(`[Twilio SMS DEV MODE] Body: ${smsBody}`)
        console.log('--------------------------------------------------')
        return {
          success: true,
          messageId: `twilio_mock_${crypto.randomUUID()}`,
          provider: 'twilio_mock',
        }
      }

      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`
      const basicAuth = Buffer.from(`${twilioSid}:${twilioAuthToken}`).toString('base64')

      const bodyParams = new URLSearchParams()
      bodyParams.append('To', recipient)
      bodyParams.append('From', twilioNumber)
      bodyParams.append('Body', smsBody)

      const res = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || `Twilio SMS request failed: ${res.statusText}`)
      }

      return {
        success: true,
        messageId: data.sid,
        provider: 'twilio',
      }
    } catch (e: any) {
      console.error(`TwilioProvider error for ${recipient}:`, e.message)
      return {
        success: false,
        error: e.message || 'Twilio SMS delivery failed',
        provider: 'twilio',
      }
    }
  }

  private buildSmsText(template: string, vars: Record<string, string>): string {
    const pName = vars.Player || vars.PlayerName || 'Gamer'
    const venue = vars.Venue || 'the Turf'
    const date = vars.Date || 'today'
    const time = vars.Time || ''
    const amount = vars.Amount || ''

    if (template.includes('login')) {
      return `TURF GAMING: Successful login detected on device ${vars.Device || 'Unknown'} in ${vars.City || 'Unknown City'} at ${vars.Time || 'just now'}.`
    }
    if (template.includes('confirm') || template.includes('book')) {
      return `🏏 Turf Booking Confirmed! Your booking at ${venue} is set for ${date} at ${time}. Enjoy your innings!`
    }
    if (template.includes('cancel')) {
      return `Booking Cancelled: Your booking at ${venue} is cancelled. Refund of ₹${amount} is in progress.`
    }
    if (template.includes('remind')) {
      return `🏏 Match Reminder: Your game at ${venue} starts in 10 minutes. Please arrive early!`
    }
    if (template.includes('rating') || template.includes('rate')) {
      return `⭐ Rating Request: Hope you enjoyed your match at ${venue}. Rate your experience here: https://trufgaming.com/rating/${vars.BookingId || ''}`
    }

    return `Turf Gaming Alert: Update for booking at ${venue}.`
  }
}
