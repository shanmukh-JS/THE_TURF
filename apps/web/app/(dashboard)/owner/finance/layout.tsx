import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  BarChart3,
  Wallet,
  CalendarClock,
  TrendingUp,
  FileText,
  Bell,
  Settings,
} from 'lucide-react'

// Mock function representing server-side authorization resolving the owner context
async function requireOwnerContext() {
  // In reality:
  // const { data: { user } } = await supabase.auth.getUser();
  // const owner = await supabase.from('owners').select('id').eq('user_id', user.id).single();
  // if (!owner) redirect('/unauthorized');
  // return owner.id;
  return 'owner-1234'
}

const navItems = [
  { name: 'Overview', href: '/owner/finance', icon: BarChart3 },
  { name: 'Payouts', href: '/owner/finance/payouts', icon: Wallet },
  { name: 'Bookings', href: '/owner/finance/bookings', icon: CalendarClock },
  { name: 'Analytics', href: '/owner/finance/analytics', icon: TrendingUp },
  { name: 'Statements', href: '/owner/finance/statements', icon: FileText },
  { name: 'Notifications', href: '/owner/finance/notifications', icon: Bell },
  { name: 'Settings', href: '/owner/finance/settings', icon: Settings },
]

export default async function OwnerFinanceLayout({ children }: { children: ReactNode }) {
  const ownerId = await requireOwnerContext()

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 font-sans">
      {/* Nested Finance Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="h-14 flex items-center px-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold tracking-tight text-emerald-400">Owner Finance</h2>
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                >
                  <item.icon className="h-4 w-4 text-emerald-500" />
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gray-950">
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
