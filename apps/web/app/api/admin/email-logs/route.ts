import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { retryFailedEmail } from '@/lib/email/mailer'
import { apiSuccess, apiError } from '@/lib/email/validation'

import { requireRole } from '@/lib/auth/requireRole'

import { rateLimitGuard } from '@/lib/utils/rateLimiter'

export async function GET(req: Request) {
  const rateLimitResponse = await rateLimitGuard(req, 'admin_api')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const adminUser = await verifyAdmin()
    if (!adminUser) {
      return apiError('UNAUTHORIZED', 'Access denied.', 403)
    }

    const { searchParams } = new URL(req.url)
    const page = Number(searchParams.get('page') || '1')
    const limit = Number(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''

    const offset = (page - 1) * limit
    const supabase = createAdminClient()

    let query = supabase
      .from('email_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`recipient.ilike.%${search}%,subject.ilike.%${search}%`)
    }

    const { data: logs, count, error } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching email logs:', error)
      return apiError('DB_ERROR', 'Failed to retrieve email logs history.')
    }

    // Get metrics for dashboard cards
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const { count: sentToday } = await supabase
      .from('email_logs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Sent')
      .gt('created_at', todayStart.toISOString())

    const { count: failedToday } = await supabase
      .from('email_logs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Failed')
      .gt('created_at', todayStart.toISOString())

    const { count: totalSent } = await supabase
      .from('email_logs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Sent')

    const { count: totalCount } = await supabase
      .from('email_logs')
      .select('*', { count: 'exact', head: true })

    const successRate =
      totalCount && totalCount > 0 ? Math.round(((totalSent || 0) / totalCount) * 100) : 100

    const { data: recentDelivered } = await supabase
      .from('email_logs')
      .select('delivery_time_ms')
      .eq('status', 'Sent')
      .not('delivery_time_ms', 'is', null)
      .limit(100)

    const avgDeliveryTime =
      recentDelivered && recentDelivered.length > 0
        ? Math.round(
            recentDelivered.reduce((sum, item) => sum + (item.delivery_time_ms || 0), 0) /
              recentDelivered.length
          )
        : 0

    return apiSuccess('Email logs retrieved.', {
      logs,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
      metrics: {
        sentToday: sentToday || 0,
        failedToday: failedToday || 0,
        successRate,
        avgDeliveryTime,
      },
    })
  } catch (err: any) {
    console.error('GET email-logs error:', err)
    return apiError('SERVER_ERROR', 'An unexpected error occurred.')
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminUser = await verifyAdmin()
    if (!adminUser) {
      return apiError('UNAUTHORIZED', 'Access denied.', 403)
    }

    const { logId } = await req.json()
    if (!logId) {
      return apiError('MISSING_FIELDS', 'Log ID is required.')
    }

    const success = await retryFailedEmail(logId)
    if (!success) {
      return apiError('RETRY_FAILED', 'Failed to dispatch email retry. Check SMTP logs.')
    }

    return apiSuccess('Email resent successfully.')
  } catch (err: any) {
    console.error('POST email-logs retry error:', err)
    return apiError('SERVER_ERROR', 'An unexpected error occurred.')
  }
}
