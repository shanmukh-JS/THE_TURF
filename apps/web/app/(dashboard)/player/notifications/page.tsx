import { createClient } from '@/lib/supabase/server'
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
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Auto-complete bookings on loading notifications page
  const now = new Date()
  const { data: rawBookings } = await supabase
    .from('bookings')
    .select('id, status, slots!inner(end_time, start_time, date), venues(name)')
    .eq('customer_id', user.id)
    .eq('status', 'CONFIRMED')

  if (rawBookings && rawBookings.length > 0) {
    for (const b of rawBookings) {
      const slot = Array.isArray(b.slots) ? b.slots[0] : b.slots
      if (slot && new Date(slot.end_time) < now) {
        // Persist update in DB
        await supabase
          .from('bookings')
          .update({ status: 'COMPLETED', review_status: 'PENDING' })
          .eq('id', b.id)

        const venue = Array.isArray(b.venues) ? b.venues[0] : b.venues
        // Insert in-app notification
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('title', 'Match Completed')
          .like('message', `%${venue?.name || 'Truf'}%`)

        if (count === 0) {
          await supabase.from('notifications').insert({
            user_id: user.id,
            title: 'Match Completed',
            message: `Your game at ${venue?.name || 'Truf'} has ended. Rate your experience and earn +20 XP.`,
            type: 'BOOKING',
            link: '/player/bookings',
            is_read: false,
          })
        }
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
