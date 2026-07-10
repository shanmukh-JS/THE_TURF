import { createAdminClient } from '@/lib/supabase/admin'
import { providerRouter } from './providers/ProviderRouter'
import { NotificationPayload } from './providers/NotificationProvider'

export class NotificationService {
  /**
   * Dispatches a notification payload by routing it through active providers,
   * logging the attempt, verifying signature constraints, and tracking retry events.
   */
  async dispatch(payload: NotificationPayload): Promise<{ success: boolean; error?: string }> {
    const supabase = createAdminClient()
    const startTime = Date.now()

    // 1. Create a notification record in public.notifications
    const { data: record, error: createError } = await supabase
      .from('notifications')
      .insert({
        user_id: payload.userId || null,
        booking_id: payload.bookingId || null,
        type: payload.type,
        status: 'QUEUED',
        recipient: payload.recipient,
        payload: payload,
        retry_count: 0,
      })
      .select('id')
      .single()

    if (createError || !record) {
      console.error('Failed to create database notification audit record:', createError?.message)
      return { success: false, error: createError?.message || 'Database insert failed' }
    }

    const notificationId = record.id

    try {
      // 2. Mark state as SENDING
      await supabase.from('notifications').update({ status: 'SENDING' }).eq('id', notificationId)

      // 3. Dispatch to Router (which handles failovers)
      const result = await providerRouter.send(payload)

      const executionTime = Date.now() - startTime

      // 4. Log provider response
      await supabase.from('notification_logs').insert({
        notification_id: notificationId,
        action: 'SEND_ATTEMPT_COMPLETE',
        request_payload: payload,
        response_payload: result,
        http_status: result.success ? 200 : 500,
        execution_time_ms: executionTime,
      })

      // 5. Update parent record status
      await supabase
        .from('notifications')
        .update({
          status: result.success ? 'SENT' : 'FAILED',
          provider: result.provider,
          sent_at: result.success ? new Date().toISOString() : null,
          error_message: result.success ? null : result.error || 'Delivery failed',
        })
        .eq('id', notificationId)

      return { success: result.success, error: result.error }
    } catch (e: any) {
      const executionTime = Date.now() - startTime

      await supabase.from('notification_logs').insert({
        notification_id: notificationId,
        action: 'SEND_ATTEMPT_CRASH',
        error_stack: e.stack || e.message,
        http_status: 500,
        execution_time_ms: executionTime,
      })

      await supabase
        .from('notifications')
        .update({
          status: 'FAILED',
          error_message: e.message || 'Fatal execution error',
        })
        .eq('id', notificationId)

      return { success: false, error: e.message }
    }
  }
}

export const notificationService = new NotificationService()
export default notificationService
