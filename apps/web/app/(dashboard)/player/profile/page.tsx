import { createClient } from '@/lib/supabase/server'
import { User, Mail, Shield, CalendarCheck } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  DashboardAnimationWrapper,
  DashboardAnimationItem,
} from '@/components/ui/DashboardAnimationWrapper'

export const metadata = {
  title: 'My Profile | TURF GAMING',
}

export default async function CustomerProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const fullName = user.user_metadata?.full_name || 'Valued Gamer'
  const role = user.user_metadata?.role || 'CUSTOMER'

  return (
    <DashboardAnimationWrapper className="p-8 space-y-8">
      <DashboardAnimationItem>
        <h1 className="text-3xl font-bold text-white tracking-tight">My Profile</h1>
        <p className="text-gray-400 mt-1">Manage your account details and preferences.</p>
      </DashboardAnimationItem>

      <div className="grid gap-6 md:grid-cols-3">
        <DashboardAnimationItem className="md:col-span-2 space-y-6">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-green-400" />
              Personal Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Full Name</label>
                <div className="text-white font-medium bg-black/40 px-4 py-3 rounded-xl border border-white/5">
                  {fullName}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1 flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Email Address
                </label>
                <div className="text-white font-medium bg-black/40 px-4 py-3 rounded-xl border border-white/5">
                  {user.email}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Account Role
                </label>
                <div className="text-white font-medium bg-black/40 px-4 py-3 rounded-xl border border-white/5 capitalize">
                  {role.toLowerCase()}
                </div>
              </div>
            </div>
          </div>
        </DashboardAnimationItem>

        <DashboardAnimationItem className="space-y-6">
          <div className="rounded-2xl border border-white/8 bg-gradient-to-br from-green-500/10 to-emerald-600/10 p-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-2xl font-bold text-white shadow-xl shadow-green-900/40">
              {fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-white">{fullName}</h3>
              <p className="text-sm text-gray-400">{user.email}</p>
            </div>
          </div>

          <Link
            href="/player/bookings"
            className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] hover:bg-white/[0.05] hover:border-green-500/30 transition-all p-5 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 group-hover:bg-green-500 group-hover:text-black transition-colors">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="text-white font-bold text-sm">My Bookings</h3>
                <p className="text-xs text-gray-500">View your reservations</p>
              </div>
            </div>
            <div className="text-gray-600 group-hover:text-white transition-colors">→</div>
          </Link>
        </DashboardAnimationItem>
      </div>
    </DashboardAnimationWrapper>
  )
}
