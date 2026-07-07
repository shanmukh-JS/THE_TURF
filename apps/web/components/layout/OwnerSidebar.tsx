'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  MapPin,
  CalendarDays,
  TrendingUp,
  Star,
  Settings,
  LogOut,
  ChevronRight,
  Zap,
  Menu,
  X,
  Clock,
  Bell,
} from 'lucide-react'

const navItems = [
  { href: '/owner', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/owner/venues', icon: MapPin, label: 'My Venues' },
  { href: '/owner/slots', icon: Clock, label: 'Manage Slots' },
  { href: '/owner/bookings', icon: CalendarDays, label: 'Bookings' },
  { href: '/owner/revenue', icon: TrendingUp, label: 'Revenue' },
  { href: '/owner/reviews', icon: Star, label: 'Reviews' },
  { href: '/owner/notifications', icon: Bell, label: 'Notifications' },
  { href: '/owner/settings', icon: Settings, label: 'Settings' },
]

export function OwnerSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)

  const displayName = user?.fullName || user?.email?.split('@')[0] || 'Owner'
  const email = user?.email || ''
  const initials = displayName.substring(0, 2).toUpperCase()

  // Close sidebar on navigation
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  return (
    <>
      {/* Mobile Toggle Bar (Only visible on small screens) */}
      <div className="md:hidden flex items-center justify-between px-6 py-4 bg-[#0a0f0a] border-b border-white/8 sticky top-16 z-30 shadow-md shadow-black/50">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-green-400" />
          <span className="font-bold text-white text-sm tracking-wide">Owner Dashboard</span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 -mr-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Overlay Background */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar - fixed on the left, slides in on mobile */}
      <aside
        className={cn(
          'flex flex-col w-64 h-[calc(100vh-64px)] bg-[#0a0f0a] border-r border-white/8 z-50 transition-transform duration-300',
          'fixed top-16 left-0',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active =
              href === '/owner'
                ? pathname === '/owner'
                : pathname === href || pathname.startsWith(href + '/')

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  active
                    ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                )}
              >
                <Icon
                  className={cn(
                    'w-4.5 h-4.5 flex-shrink-0',
                    active ? 'text-green-400' : 'text-gray-500 group-hover:text-gray-300'
                  )}
                />
                <span>{label}</span>
                {active && <ChevronRight className="ml-auto w-4 h-4 text-green-500/60" />}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/8">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all cursor-pointer group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 overflow-hidden relative">
              {user?.logoUrl ? (
                <img src={user.logoUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{displayName}</p>
              <p className="text-xs text-gray-500 truncate">{email}</p>
            </div>
            <button
              onClick={async () => {
                await logout()
                router.push('/auth/login')
              }}
              className="p-1 hover:bg-red-500/10 rounded-lg transition-colors group/btn"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4 text-gray-600 group-hover/btn:text-red-400 transition-colors flex-shrink-0" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
