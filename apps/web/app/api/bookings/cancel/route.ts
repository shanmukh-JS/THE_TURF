import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { refundQueue } from '@/workers/queues'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      bookingId,
      cancellationReason,
      expectedVersion,
      correlationId = crypto.randomUUID(),
    } = await request.json()

    if (!bookingId || expectedVersion === undefined) {
      return NextResponse.json({ error: 'Missing bookingId or expectedVersion' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Call the database atomic function
    const { data: rpcResult, error: rpcError } = await adminClient.rpc('rpc_cancel_booking_v1', {
      p_booking_id: bookingId,
      p_actor_id: user.id,
      p_cancellation_reason: cancellationReason || 'Player requested cancellation',
      p_correlation_id: correlationId,
      p_expected_version: Number(expectedVersion),
    })

    if (rpcError) {
      console.error('[API: Cancel Booking] RPC Error:', rpcError)
      return NextResponse.json(
        { error: rpcError.message || 'Cancellation transaction failed' },
        { status: 400 }
      )
    }

    const result = rpcResult as any
    const { emitBookingCancelRequestedEvent, emitRefundRequestedEvent, emitBookingCancelledEvent } =
      await import('@/lib/events/handlers')

    // Publish booking cancel requested event
    await emitBookingCancelRequestedEvent({
      bookingId: result.booking_id,
      userId: user.id,
      correlationId: result.correlation_id,
      payload: { cancellationReason, expectedVersion },
    })

    // If refund is queued, push to BullMQ queue and publish refund requested event
    if (result.refund_status === 'QUEUED') {
      await emitRefundRequestedEvent({
        refundId: result.refund_id,
        bookingId: result.booking_id,
        userId: user.id,
        amount: Number(result.refund_amount),
        correlationId: result.correlation_id,
      })

      try {
        await refundQueue.add(
          'process-refund',
          {
            refundId: result.refund_id,
            bookingId: result.booking_id,
            correlationId: result.correlation_id,
          },
          {
            jobId: result.idempotency_key, // Ensure worker-level idempotency
          }
        )
      } catch (queueError: any) {
        console.error('[API: Cancel Booking] Failed to enqueue refund job:', queueError)
        // Note: Even if enqueuing fails, the database has been committed with refund_status = 'QUEUED'.
        // The reconciliationWorker will pick it up and process it. So we don't throw an error to the user.
      }
    } else {
      // calculated refund is 0, so it completed immediately
      try {
        const { data: bookingDetail } = await adminClient
          .from('bookings')
          .select(
            'id, advance_paid, customer_id, total_amount, venues(name), users(phone, email, customer_profiles(full_name))'
          )
          .eq('id', bookingId)
          .single()

        if (bookingDetail) {
          const venue = bookingDetail.venues as any
          const userRec = bookingDetail.users as any
          const ownerProfile = userRec?.customer_profiles

          await emitBookingCancelledEvent({
            bookingId: result.booking_id,
            userId: user.id,
            phone: userRec?.phone || '',
            fullName:
              (Array.isArray(ownerProfile) ? ownerProfile[0] : ownerProfile)?.full_name || 'Player',
            venueName: venue?.name || 'the Turf',
            amount: '0',
            reason: cancellationReason || 'Cancelled immediately (no refund)',
          })
        }
      } catch (evtError) {
        console.error(
          '[API: Cancel Booking] Failed to trigger cancellation completion events:',
          evtError
        )
      }
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[API: Cancel Booking] Unexpected error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
