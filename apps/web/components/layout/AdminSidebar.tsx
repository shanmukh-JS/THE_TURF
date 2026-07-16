'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'
import {
  LayoutDashboard,
  Building2,
  Users,
  CalendarDays,
  CreditCard,
  CheckSquare,
  Flag,
  Settings,
  Zap,
  ChevronRight,
  Menu,
  X,
  Bell,
} from 'lucide-react'

const navItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/users', icon: Users, label: 'Users' },
  { href: '/admin/approvals', icon: CheckSquare, label: 'Owner Approvals' },
  { href: '/admin/venues', icon: Building2, label: 'Turf Management' },
  { href: '/admin/bookings', icon: CalendarDays, label: 'Bookings' },
  { href: '/admin/payments', icon: CreditCard, label: 'Payments' },
  { href: '/admin/reports', icon: Flag, label: 'Reports' },
  { href: '/admin/notifications', icon: Bell, label: 'Notifications' },
  { href: '/admin/settings', icon: Settings, label: 'Settings' },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const { user } = useAuthStore()

  // Close sidebar on navigation
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  const displayName = user?.fullName || user?.email?.split('@')[0] || 'Super Admin'
  const email = user?.email || 'admin@turfgaming.com'
  const initial = displayName.slice(0, 2).toUpperCase()

  return (
    <>
      {/* Mobile Toggle Bar */}
      <div className="md:hidden flex items-center justify-between px-6 py-4 bg-[#080808] border-b border-white/8 sticky top-16 z-30 shadow-md shadow-black/50">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-green-400" />
          <span className="font-bold text-white text-sm tracking-wide">Admin Panel</span>
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

      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col w-64 h-[calc(100vh-64px)] bg-[#080808] border-r border-white/8 z-50 transition-transform duration-300',
          'fixed top-16 left-0',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active =
              href === '/admin'
                ? pathname === '/admin'
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
            {user?.logoUrl ? (
              <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20">
                <img src={user.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-red-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {initial}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{displayName}</p>
              <p className="text-xs text-gray-500 truncate">{email}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
