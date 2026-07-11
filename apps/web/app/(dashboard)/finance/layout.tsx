import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  BarChart3,
  BookOpen,
  ArrowRightLeft,
  Building2,
  Landmark,
  Scale,
  Activity,
  FileSearch,
  Download,
} from 'lucide-react'

// Mock authentication and RBAC function (to be replaced with actual Supabase Auth / Role check)
async function requireFinanceAccess() {
  // Example RBAC check
  const userPermissions = [
    'finance.read',
    'finance.export',
    'finance.audit.read',
    'finance.reconciliation.read',
  ]

  if (!userPermissions.includes('finance.read')) {
    redirect('/unauthorized')
  }
}

const navItems = [
  { name: 'Overview', href: '/finance', icon: BarChart3 },
  { name: 'Ledger', href: '/finance/ledger', icon: BookOpen },
  { name: 'Transactions', href: '/finance/transactions', icon: ArrowRightLeft },
  { name: 'Settlements', href: '/finance/settlements', icon: Building2 },
  { name: 'Payouts', href: '/finance/payouts', icon: Landmark },
  { name: 'Reconciliation', href: '/finance/reconciliation', icon: Scale },
  { name: 'Workers', href: '/finance/workers', icon: Activity },
  { name: 'Audit Logs', href: '/finance/audit', icon: FileSearch },
  { name: 'Reports', href: '/finance/reports', icon: Download },
]

export default async function FinanceLayout({ children }: { children: ReactNode }) {
  await requireFinanceAccess()

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-800">
          <h1 className="text-xl font-bold tracking-tight text-emerald-400">TRUF Finance</h1>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
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

        <div className="p-4 border-t border-gray-800 text-xs text-gray-500">
          Operations Console v1.0
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gray-950">
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
