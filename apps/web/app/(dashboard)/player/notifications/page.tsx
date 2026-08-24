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
