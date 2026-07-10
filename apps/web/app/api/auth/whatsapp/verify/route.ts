import { NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

const verifyOtpSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
})

const MAX_ATTEMPTS = 5

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const result = verifyOtpSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }
    const { phone, otp } = result.data

    const supabase = createAdminClient()

    // 1. Get the latest pending OTP for this number
    const { data: record, error: fetchError } = await supabase
      .from('whatsapp_otps')
      .select('*')
      .eq('phone_number', phone)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (fetchError || !record) {
      return NextResponse.json(
        { error: 'No pending OTP found. Please request a new one.' },
        { status: 400 }
      )
    }

    // 2. Check Expiration
    if (new Date() > new Date(record.expires_at)) {
      await supabase.from('whatsapp_otps').update({ status: 'EXPIRED' }).eq('id', record.id)
      return NextResponse.json(
        { error: 'OTP has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // 3. Check Attempt Limits
    if (record.attempt_count >= MAX_ATTEMPTS) {
      await supabase.from('whatsapp_otps').update({ status: 'FAILED' }).eq('id', record.id)
      return NextResponse.json(
        { error: 'Maximum verification attempts reached. Please request a new OTP.' },
        { status: 429 }
      )
    }

    // Increment attempt count
    await supabase
      .from('whatsapp_otps')
      .update({ attempt_count: record.attempt_count + 1 })
      .eq('id', record.id)

    // 4. Verify Hash
    const isValid = await bcrypt.compare(otp, record.hashed_otp)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 })
    }

    // 5. Mark as Verified
    await supabase.from('whatsapp_otps').update({ status: 'VERIFIED' }).eq('id', record.id)

    // 6. Authenticate User (The Supabase Custom Auth Trick)
    // We generate a strong random password, update/create the user with it,
    // and then sign them in to generate a valid Supabase session.
    const tempPassword = crypto.randomBytes(32).toString('hex') + 'A1!'

    let userId: string

    // Check if user exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingUser = existingUsers?.users.find((u) => u.phone === phone.replace('+', ''))

    if (existingUser) {
      userId = existingUser.id
      // Update their password temporarily to sign them in
      await supabase.auth.admin.updateUserById(userId, { password: tempPassword })
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        phone: phone.replace('+', ''),
        password: tempPassword,
        phone_confirm: true,
      })
      if (createError || !newUser.user) {
        throw new Error(createError?.message || 'Failed to create user')
      }
      userId = newUser.user.id

      // Optionally create a customer_profile
      await supabase
        .from('customer_profiles')
        .insert({
          user_id: userId,
          phone: phone,
        })
        .select()
        .maybeSingle()
    }

    // Generate Session via Password login
    const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
      phone: phone.replace('+', ''),
      password: tempPassword,
    })

    if (signInError || !sessionData.session) {
      throw new Error(signInError?.message || 'Failed to generate session')
    }

    // Return the session tokens so the frontend can set them
    return NextResponse.json({
      success: true,
      session: sessionData.session,
    })
  } catch (error: any) {
    console.error('Verify OTP Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
