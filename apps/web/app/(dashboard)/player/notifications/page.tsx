import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import {
  DashboardAnimationWrapper,
  DashboardAnimationItem,
} from '@/components/ui/DashboardAnimationWrapper'
import { NotificationListClient } from '@/components/dashboard/NotificationListClient'

export const metadata = {
  title: 'Notifications | TURF GAMING',
}

export default async function CustomerNotificationsPage() {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Auto-complete bookings and ensure "Match Completed" notifications exist
  const now = new Date()

  // 1. Transition CONFIRMED → COMPLETED for past bookings
  const { data: confirmedBookings } = await adminSupabase
    .from('bookings')
    .select('id, status, slots!inner(end_time, start_time, date), venues(name)')
    .eq('customer_id', user.id)
    .eq('status', 'CONFIRMED')

  if (confirmedBookings && confirmedBookings.length > 0) {
    for (const b of confirmedBookings) {
      const slot = Array.isArray(b.slots) ? b.slots[0] : b.slots
      if (slot && new Date(slot.end_time) < now) {
        await adminSupabase
          .from('bookings')
          .update({ status: 'COMPLETED', review_status: 'PENDING' })
          .eq('id', b.id)
      }
    }
  }

  // 2. Ensure "Match Completed" notification exists for ALL completed-pending bookings
  const { data: completedBookings } = await adminSupabase
    .from('bookings')
    .select('id, venues(name)')
    .eq('customer_id', user.id)
    .eq('status', 'COMPLETED')
    .eq('review_status', 'PENDING')

  if (completedBookings && completedBookings.length > 0) {
    for (const b of completedBookings) {
      const venue = Array.isArray(b.venues) ? b.venues[0] : b.venues
      const venueName = venue?.name || 'Truf'

      // Check if notification already exists
      const { count } = await adminSupabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .ilike('title', '%Match Completed%')

      if (count === 0) {
        await adminSupabase.from('notifications').insert({
          user_id: user.id,
          title: '🎉 Match Completed!',
          message: `Your game at ${venueName} has ended. Rate your experience and earn +20 XP!`,
          type: 'BOOKING',
          link: '/player/bookings',
          is_read: false,
        })
      }
    }
  }

  const { data: notificationsData } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const notifications = notificationsData || []

  return (
    <DashboardAnimationWrapper className="p-8 space-y-8">
      <DashboardAnimationItem>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Notifications</h1>
        <p className="text-gray-400 mt-1">
          Stay updated with your latest bookings and platform updates.
        </p>
      </DashboardAnimationItem>

      <DashboardAnimationItem>
        <NotificationListClient initialNotifications={notifications} userId={user.id} />
      </DashboardAnimationItem>
    </DashboardAnimationWrapper>
  )
}
