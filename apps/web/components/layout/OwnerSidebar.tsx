'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
} from 'lucide-react'

const navItems = [
  { href: '/owner', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/owner/venues', icon: MapPin, label: 'My Venues' },
  { href: '/owner/bookings', icon: CalendarDays, label: 'Bookings' },
  { href: '/owner/revenue', icon: TrendingUp, label: 'Revenue' },
  { href: '/owner/reviews', icon: Star, label: 'Reviews' },
  { href: '/owner/settings', icon: Settings, label: 'Settings' },
]

export function OwnerSidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col w-64 h-screen bg-[#0a0f0a] border-r border-white/8 sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-white/8">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-900/40">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-white text-sm tracking-wide">TRUF GAMING</p>
          <p className="text-[11px] text-green-400 font-medium">Owner Portal</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
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
              <Icon className={cn('w-4.5 h-4.5 flex-shrink-0', active ? 'text-green-400' : 'text-gray-500 group-hover:text-gray-300')} />
              <span>{label}</span>
              {active && <ChevronRight className="ml-auto w-4 h-4 text-green-500/60" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/8">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            RK
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Rajesh Kumar</p>
            <p className="text-xs text-gray-500 truncate">rajesh@truf.com</p>
          </div>
          <LogOut className="w-4 h-4 text-gray-600 group-hover:text-red-400 transition-colors flex-shrink-0" />
        </div>
      </div>
    </aside>
  )
}
