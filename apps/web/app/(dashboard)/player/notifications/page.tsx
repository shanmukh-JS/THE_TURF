import { Bell, CalendarCheck, CreditCard, Info, ShieldAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  DashboardAnimationWrapper,
  DashboardAnimationItem,
} from '@/components/ui/DashboardAnimationWrapper'

export const metadata = {
  title: 'Notifications | TRUF GAMING',
}

const mockNotifications = [
  {
    id: 1,
    title: 'Welcome to TRUF GAMING!',
    description: 'Explore the best cricket boxes in your city and book your slots instantly.',
    time: 'Just now',
    type: 'welcome',
    icon: Info,
    color: 'text-green-400 bg-green-500/10',
  },
]

export default async function CustomerNotificationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
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
        {mockNotifications.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl bg-white/[0.02] space-y-3">
            <Bell className="w-8 h-8 text-gray-600 mx-auto" />
            <p className="text-sm text-gray-500">
              You don&apos;t have any notifications at the moment.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {mockNotifications.map((n) => {
              const Icon = n.icon
              return (
                <div
                  key={n.id}
                  className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 flex gap-4 hover:border-white/15 transition-all"
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${n.color}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-start gap-4">
                      <h3 className="font-bold text-white text-sm">{n.title}</h3>
                      <span className="text-[10px] text-gray-500 whitespace-nowrap">{n.time}</span>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">{n.description}</p>
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
