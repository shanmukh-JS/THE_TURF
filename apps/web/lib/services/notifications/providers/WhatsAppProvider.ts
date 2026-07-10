import { createAdminClient } from '@/lib/supabase/admin'
import { NotificationProvider, NotificationPayload, ProviderResponse } from './NotificationProvider'

export class WhatsAppProvider implements NotificationProvider {
  async send(payload: NotificationPayload): Promise<ProviderResponse> {
    const WA_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN
    const WA_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID
    const base_url = process.env.WHATSAPP_BASE_URL || 'https://graph.facebook.com'
    const version = process.env.WHATSAPP_API_VERSION || 'v23.0'

    // Formulate variables
    const { recipient, templateName, variables } = payload

    try {
      // 1. Fetch template from DB to resolve parameter order
      const supabase = createAdminClient()
      const { data: templateRecord } = await supabase
        .from('notification_templates')
        .select('variables, language')
        .eq('name', templateName)
        .maybeSingle()

      let parameters: any[] = []
      let lang = 'en'

      if (templateRecord) {
        lang = templateRecord.language
        // Map ordered variables
        parameters = templateRecord.variables.map((vKey: string) => {
          const val = variables[vKey]
          if (val === undefined || val === null) {
            throw new Error(
              `Template variable validation failed: variable "${vKey}" is required but missing.`
            )
          }
          return { type: 'text', text: String(val) }
        })
      } else {
        // Fallback: alphabetical sorting if template isn't registered in DB yet
        parameters = Object.keys(variables)
          .sort()
          .map((vKey) => ({ type: 'text', text: String(variables[vKey] || '') }))
      }

      // Check if credentials are missing -> Fallback to Dev Mode
      if (!WA_TOKEN || !WA_PHONE_ID) {
        console.log('--------------------------------------------------')
        console.log(`[WhatsApp DEV MODE] Sending to: ${recipient}`)
        console.log(`[WhatsApp DEV MODE] Template: ${templateName}`)
        console.log(`[WhatsApp DEV MODE] Variables:`, variables)
        console.log('--------------------------------------------------')
        return {
          success: true,
          messageId: `dev_${crypto.randomUUID()}`,
          provider: 'whatsapp_mock',
        }
      }

      // 2. Format request payload
      const requestUrl = `${base_url}/${version}/${WA_PHONE_ID}/messages`
      const requestBody = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient,
        type: 'template',
        template: {
          name: templateName,
          language: { code: lang },
          components: [
            {
              type: 'body',
              parameters: parameters,
            },
          ],
        },
      }

      // 3. Make HTTP call to Meta
      const res = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WA_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error?.message || `WhatsApp API request failed: ${res.statusText}`)
      }

      const messageId = data.messages?.[0]?.id

      return {
        success: true,
        messageId: messageId || `wa_${crypto.randomUUID()}`,
        provider: 'whatsapp_meta',
      }
    } catch (e: any) {
      console.error(`WhatsAppProvider error for ${recipient}:`, e.message)
      return {
        success: false,
        error: e.message || 'WhatsApp Meta delivery failed',
        provider: 'whatsapp_meta',
      }
    }
  }
}
