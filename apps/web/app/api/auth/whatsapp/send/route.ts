import { NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

// Input validation schema
const sendOtpSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format (E.164 required)'),
})

// Configuration
const OTP_EXPIRY_MINUTES = 5
const RESEND_COOLDOWN_SECONDS = 60
const MAX_RESENDS_PER_DAY = 5

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // 1. Validate Input
    const result = sendOtpSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }
    const { phone } = result.data

    const supabase = createAdminClient()

    // 2. Rate Limiting & Cooldown Checks
    const { data: existingOtp } = await supabase
      .from('whatsapp_otps')
      .select('*')
      .eq('phone_number', phone)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existingOtp) {
      const timeSinceLastOtp =
        (new Date().getTime() - new Date(existingOtp.created_at).getTime()) / 1000
      if (timeSinceLastOtp < RESEND_COOLDOWN_SECONDS) {
        return NextResponse.json(
          {
            error: `Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - timeSinceLastOtp)} seconds before requesting a new OTP.`,
          },
          { status: 429 }
        )
      }
      if (existingOtp.resend_count >= MAX_RESENDS_PER_DAY) {
        return NextResponse.json({ error: 'Max resend limit reached for today.' }, { status: 429 })
      }
    }

    // 3. Generate Secure 6-Digit OTP & Hash
    const otp = crypto.randomInt(100000, 999999).toString()
    const salt = await bcrypt.genSalt(10)
    const hashedOtp = await bcrypt.hash(otp, salt)
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000).toISOString()

    // 4. Invalidate Previous OTPs
    await supabase
      .from('whatsapp_otps')
      .update({ status: 'EXPIRED' })
      .eq('phone_number', phone)
      .eq('status', 'PENDING')

    // 5. Save New OTP
    const resendCount = existingOtp ? existingOtp.resend_count + 1 : 0
    const { error: dbError } = await supabase.from('whatsapp_otps').insert({
      phone_number: phone,
      hashed_otp: hashedOtp,
      expires_at: expiresAt,
      resend_count: resendCount,
      status: 'PENDING',
    })

    if (dbError) throw new Error('Database error while saving OTP')

    // 6. Send OTP via Meta WhatsApp Cloud API
    const WA_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN
    const WA_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID
    const WA_TEMPLATE = process.env.WHATSAPP_TEMPLATE_NAME || 'auth_otp'

    if (!WA_TOKEN || !WA_PHONE_ID) {
      console.warn('WhatsApp API credentials missing. Logging OTP for development:', otp)
      // If dev environment without credentials, just succeed (useful for testing)
      if (process.env.NODE_ENV !== 'production') {
        return NextResponse.json({ success: true, devMode: true, message: 'OTP logged to console' })
      }
      return NextResponse.json({ error: 'WhatsApp integration is not configured' }, { status: 500 })
    }

    const waResponse = await fetch(`https://graph.facebook.com/v17.0/${WA_PHONE_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WA_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone.replace('+', ''), // Meta API expects number without '+'
        type: 'template',
        template: {
          name: WA_TEMPLATE,
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: [{ type: 'text', text: otp }],
            },
            {
              type: 'button',
              sub_type: 'url',
              index: '0',
              parameters: [{ type: 'text', text: otp }],
            },
          ],
        },
      }),
    })

    if (!waResponse.ok) {
      const errorData = await waResponse.json()
      console.error('WhatsApp API Error:', errorData)
      return NextResponse.json({ error: 'Failed to send WhatsApp message' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'OTP sent successfully' })
  } catch (error: any) {
    console.error('Send OTP Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
