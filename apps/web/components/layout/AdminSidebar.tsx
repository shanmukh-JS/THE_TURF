'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Building2,
  Users,
  CalendarDays,
  CreditCard,
  CheckSquare,
  Flag,
  Settings,
  LogOut,
  Zap,
  ChevronRight,
  X,
} from 'lucide-react'

const navItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/users', icon: Users, label: 'Users' },
  { href: '/admin/approvals', icon: CheckSquare, label: 'Owner Approvals' },
  { href: '/admin/venues', icon: Building2, label: 'Turf Management' },
  { href: '/admin/bookings', icon: CalendarDays, label: 'Bookings' },
  { href: '/admin/payments', icon: CreditCard, label: 'Payments' },
  { href: '/admin/reports', icon: Flag, label: 'Reports' },
  { href: '/admin/settings', icon: Settings, label: 'Settings' },
]

export function AdminSidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col w-64 h-screen bg-[#080808] border-r border-white/8 sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-white/8 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-900/40">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm tracking-wide">TRUF GAMING</p>
            <p className="text-[11px] text-rose-400 font-medium">Super Admin</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="md:hidden p-2 text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              )}
            >
              <Icon
                className={cn(
                  'w-4 h-4 flex-shrink-0',
                  active ? 'text-green-400' : 'text-gray-500 group-hover:text-gray-300'
                )}
              />
              <span>{label}</span>
              {active && <ChevronRight className="ml-auto w-3.5 h-3.5 text-green-500/60" />}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-white/8">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-red-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            SA
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Super Admin</p>
            <p className="text-xs text-gray-500 truncate">admin@trufgaming.com</p>
          </div>
          <LogOut className="w-4 h-4 text-gray-600 group-hover:text-red-400 transition-colors flex-shrink-0" />
        </div>
      </div>
    </aside>
  )
}
