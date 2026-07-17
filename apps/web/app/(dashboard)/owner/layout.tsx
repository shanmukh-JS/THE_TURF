import { OwnerSidebar } from '@/components/layout/OwnerSidebar'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: dbUser } = await supabase
    .from('users')
    .select('is_suspended')
    .eq('id', user.id)
    .single()

  if (dbUser?.is_suspended) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-[#060d06] flex items-center justify-center p-4">
        <div className="max-w-md w-full glass-panel rounded-3xl p-8 text-center space-y-6 border border-red-500/20">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Account Suspended</h1>
            <p className="text-gray-400">
              Your owner account has been suspended due to violations of our terms of service or
              unresolved reports. You cannot access the owner dashboard or manage turfs at this
              time.
            </p>
          </div>
          <div className="pt-4 border-t border-white/10">
            <p className="text-sm text-gray-500">
              Please contact support if you believe this is a mistake.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#060d06] relative">
      <OwnerSidebar />
      <main className="md:pl-64 w-full min-h-[calc(100vh-64px)] transition-all duration-300">
        {children}
      </main>
    </div>
  )
}
