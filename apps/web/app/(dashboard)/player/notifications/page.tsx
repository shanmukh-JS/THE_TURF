import { Bell, CalendarCheck, CreditCard, Info, ShieldAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  DashboardAnimationWrapper,
  DashboardAnimationItem,
} from '@/components/ui/DashboardAnimationWrapper'

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

  // Function to format time elapsed
  const timeAgo = (dateStr: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000)
    if (seconds < 60) return 'Just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const getIconAndColor = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return { icon: CalendarCheck, color: 'text-green-400 bg-green-500/10' }
      case 'WARNING':
        return { icon: ShieldAlert, color: 'text-amber-400 bg-amber-500/10' }
      case 'ERROR':
        return { icon: ShieldAlert, color: 'text-red-400 bg-red-500/10' }
      case 'BOOKING':
        return { icon: CreditCard, color: 'text-blue-400 bg-blue-500/10' }
      case 'INFO':
      default:
        return { icon: Info, color: 'text-blue-400 bg-blue-500/10' }
    }
  }

  return (
    <DashboardAnimationWrapper className="p-8 space-y-8">
      <DashboardAnimationItem>
        <h1 className="text-3xl font-bold text-white tracking-tight">Notifications</h1>
        <p className="text-gray-400 mt-1">
          Stay updated with your latest bookings and platform updates.
        </p>
      </DashboardAnimationItem>

      <DashboardAnimationItem className="max-w-2xl">
        {notifications.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl bg-white/[0.02] space-y-3">
            <Bell className="w-8 h-8 text-gray-600 mx-auto" />
            <p className="text-sm text-gray-500">
              You don&apos;t have any notifications at the moment.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => {
              const { icon: Icon, color } = getIconAndColor(n.type)
              return (
                <div
                  key={n.id}
                  className={`rounded-2xl border border-white/8 ${n.is_read ? 'bg-white/[0.01]' : 'bg-white/[0.04] border-white/15'} p-5 flex gap-4 hover:border-white/15 transition-all`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-start gap-4">
                      <h3
                        className={`text-sm ${n.is_read ? 'text-gray-300 font-medium' : 'text-white font-bold'}`}
                      >
                        {n.title}
                      </h3>
                      <span className="text-[10px] text-gray-500 whitespace-nowrap">
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">{n.message}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </DashboardAnimationItem>
    </DashboardAnimationWrapper>
  )
}
