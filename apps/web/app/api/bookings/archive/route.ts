import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const archiveSchema = z.object({
  bookingId: z.string().uuid(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = archiveSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error?.errors[0]?.message || 'Validation error' },
        { status: 400 }
      )
    }

    const { bookingId } = parsed.data
    const supabase = createAdminClient()

    // 1. Fetch booking to check if reviewed
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('id, review_status, customer_id')
      .eq('id', bookingId)
      .maybeSingle()

    if (bookingErr || !booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
    }

    // Recommendation check: Must be reviewed before archiving
    if (booking.review_status === 'PENDING') {
      return NextResponse.json(
        { error: 'Complete your review to unlock Archive. 🎁 Earn up to +50 XP instantly!' },
        { status: 403 }
      )
    }

    // 2. Archive booking
    const { error: updateErr } = await supabase
      .from('bookings')
      .update({
        hidden_from_player: true,
        archived_at: new Date().toISOString(),
      })
      .eq('id', bookingId)

    if (updateErr) throw updateErr

    return NextResponse.json({
      success: true,
      message: 'Booking archived successfully.',
    })
  } catch (err: any) {
    console.error('Archive booking error:', err.message)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
