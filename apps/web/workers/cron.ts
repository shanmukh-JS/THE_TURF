import cron from 'node-cron'
import { createAdminClient } from '@/lib/supabase/admin'
import { notificationService } from '@/lib/services/notifications/NotificationService'

// Run every minute at the top of the minute
cron.schedule('* * * * *', async () => {
  console.log(`[Cron] Checking for upcoming bookings...`)
  const supabase = createAdminClient()

  try {
    const now = new Date()

    // We are looking for bookings that start exactly 10 minutes from now (rounded to the minute)
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60000)

    // Format to HH:MM to match how slots are usually stored,
    // or just use timestamps if bookings store exact start_time.
    // In TRUF, bookings join with slots.
    // Let's assume slots have 'date' (YYYY-MM-DD) and 'start_time' (timestamp or time).
    // The exact query depends on the schema, but typically we find bookings where
    // status is 'CONFIRMED' and start_time is between now + 9m and now + 11m.

    // We will query bookings that are CONFIRMED and haven't had a reminder sent.
    // The reminderWorker guarantees idempotency via reminder_logs, so we can just grab all
    // confirmed bookings for today where the start time is near.

    const todayStr = tenMinutesFromNow.toISOString().split('T')[0]
    const currentTimeStr = tenMinutesFromNow.toTimeString().split(' ')[0] // HH:MM:SS

    // Simple approach: Fetch all today's confirmed bookings, filter in JS for precise 10 min window
    // (In production with massive scale, this would be an exact SQL join query)
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(
        `
        id,
        user_id,
        venue_id,
        status,
        users ( name, phone, email ),
        venues ( name ),
        slots!inner ( date, start_time, end_time )
      `
      )
      .eq('status', 'CONFIRMED')
      .eq('slots.date', todayStr)

    if (error || !bookings) {
      console.error(`[Cron] Failed to fetch bookings:`, error)
      return
    }

    let dispatched = 0

    for (const booking of bookings) {
      const slot = Array.isArray(booking.slots) ? booking.slots[0] : booking.slots
      if (!slot) continue

      // Assuming start_time is a standard timestamp or time string
      const startTime = new Date(`${slot.date}T${slot.start_time}`)

      const diffMinutes = Math.round((startTime.getTime() - now.getTime()) / 60000)

      const user = Array.isArray(booking.users) ? booking.users[0] : booking.users
      const venue = Array.isArray(booking.venues) ? booking.venues[0] : booking.venues

      // If it starts in exactly 9, 10, or 11 minutes (giving a 3 min buffer for cron drift)
      if (diffMinutes >= 9 && diffMinutes <= 11) {
        // Dispatch domain event! The reminderWorker will handle idempotency and queues
        await notificationService.publishEvent('BOOKING_REMINDER_10_MIN', {
          bookingId: booking.id,
          userId: booking.user_id,
          venueId: booking.venue_id,
          email: user?.email,
          playerName: user?.name || 'Player',
          venueName: venue?.name || 'Truf Venue',
          date: slot.date,
          timeSlot: `${slot.start_time} - ${slot.end_time}`,
          mapsUrl: `https://maps.google.com/?q=${encodeURIComponent(venue?.name || '')}`,
        })

        dispatched++
      }
    }

    if (dispatched > 0) {
      console.log(`[Cron] Dispatched 10-minute reminders for ${dispatched} bookings.`)
    }

    // 2. Transition past confirmed bookings to COMPLETED
    const { data: pastBookings, error: pastErr } = await supabase
      .from('bookings')
      .select('id, customer_id, slots!inner(end_time, start_time, date), venues(name)')
      .eq('status', 'CONFIRMED')

    if (!pastErr && pastBookings) {
      for (const booking of pastBookings) {
        const slot = Array.isArray(booking.slots) ? booking.slots[0] : booking.slots
        if (slot && new Date(slot.end_time) < now) {
          const { error: updateErr } = await supabase
            .from('bookings')
            .update({ status: 'COMPLETED', review_status: 'PENDING' })
            .eq('id', booking.id)

          if (!updateErr) {
            console.log(`[Cron] Booking ${booking.id} auto-completed.`)

            const venue = Array.isArray(booking.venues) ? booking.venues[0] : booking.venues
            // Insert in-app notification
            await supabase.from('notifications').insert({
              user_id: booking.customer_id,
              title: '🎉 Match Completed!',
              message: `Your game at ${venue?.name || 'Truf'} has ended. Rate your experience and earn up to +50 XP.`,
              type: 'BOOKING',
              link: '/player/bookings',
              is_read: false,
            })

            // Queue notification outbox event
            await notificationService.publishEvent('BOOKING_COMPLETED_REVIEW_PROMPT', {
              bookingId: booking.id,
              userId: booking.customer_id,
              venueName: venue?.name || 'Truf Venue',
              timeSlot: `${slot.start_time} - ${slot.end_time}`,
              date: slot.date,
            })
          }
        }
      }
    }
  } catch (error) {
    console.error(`[Cron] Unexpected error:`, error)
  }
})

// 3. Reconciliation Cron Job - runs every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  console.log(`[Cron: Reconciliation] Scanning for stuck processing/pending refunds...`)
  const supabase = createAdminClient()

  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60000).toISOString()

    // Fetch refunds that are stuck in PROCESSING or REQUESTED/QUEUED and haven't been updated for 10 minutes
    const { data: stuckRefunds, error } = await supabase
      .from('refunds')
      .select('*')
      .in('status', ['PROCESSING', 'REQUESTED', 'QUEUED', 'RETRYING'])
      .lt('updated_at', tenMinutesAgo)

    if (error || !stuckRefunds || stuckRefunds.length === 0) {
      if (error) console.error(`[Cron: Reconciliation] Fetch error:`, error)
      return
    }

    console.log(`[Cron: Reconciliation] Found ${stuckRefunds.length} stuck refunds to reconcile.`)

    const { getPaymentProvider } = await import('@/lib/payments/factory')
    const provider = getPaymentProvider()

    for (const refund of stuckRefunds) {
      try {
        if (refund.status === 'PROCESSING' && refund.refund_id) {
          // Query Razorpay directly for the refund status
          console.log(
            `[Cron: Reconciliation] Fetching refund status from Razorpay for refund ${refund.id} (Razorpay Ref: ${refund.refund_id})`
          )
          const providerRefund = await provider.fetchRefund(refund.payment_id, refund.refund_id)

          if (providerRefund && providerRefund.status === 'processed') {
            console.log(
              `[Cron: Reconciliation] Refund ${refund.id} confirmed processed by Razorpay. Completing locally.`
            )
            const { data: result, error: rpcErr } = await supabase.rpc('rpc_complete_refund_v1', {
              p_provider_refund_id: refund.refund_id,
              p_correlation_id: refund.correlation_id,
            })
            if (rpcErr) throw rpcErr
          } else if (providerRefund && providerRefund.status === 'failed') {
            console.warn(
              `[Cron: Reconciliation] Refund ${refund.id} marked failed by Razorpay. Failing locally.`
            )
            const { data: result, error: rpcErr } = await supabase.rpc('rpc_fail_refund_v1', {
              p_provider_refund_id: refund.refund_id,
              p_error_message: 'Razorpay reported failure',
              p_correlation_id: refund.correlation_id,
            })
            if (rpcErr) throw rpcErr
          } else {
            console.log(
              `[Cron: Reconciliation] Refund ${refund.id} is still in provider status: ${providerRefund?.status || 'unknown'}. Skipping.`
            )
          }
        } else if (
          refund.status === 'REQUESTED' ||
          refund.status === 'QUEUED' ||
          refund.status === 'RETRYING'
        ) {
          // If stuck in requested or queued, we should re-enqueue the job to BullMQ
          console.log(
            `[Cron: Reconciliation] Refund ${refund.id} is stuck in ${refund.status}. Re-enqueuing worker job.`
          )
          const { refundQueue } = await import('./queues')
          await refundQueue.add(
            'process-refund',
            {
              refundId: refund.id,
              bookingId: refund.booking_id,
              correlationId: refund.correlation_id,
            },
            {
              jobId: refund.idempotency_key, // ensure worker-level idempotency
            }
          )
        }
      } catch (err: any) {
        console.error(
          `[Cron: Reconciliation] Error reconciling refund ${refund.id}:`,
          err.message || err
        )
      }
    }
  } catch (err: any) {
    console.error(`[Cron: Reconciliation] Unexpected loop error:`, err.message || err)
  }
})

console.log(`✅ Reminder Cron Job initialized.`)
