'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Zap, Menu, X, User, LogIn, ChevronDown, LayoutDashboard, CalendarCheck, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

const navLinks = [
  { label: 'Browse Venues', href: '/venues' },
  { label: 'How it Works', href: '/#how-it-works' },
  { label: 'List Your Venue', href: '/owner/onboarding' },
]

// Mock auth state — replace with Zustand store in production
const mockUser = null // set to { name: 'Arjun', role: 'CUSTOMER' } to test logged-in state

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const user = mockUser as { name: string; role: string } | null

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/8 bg-black/60 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-900/40">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white tracking-wide text-sm">TRUF GAMING</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Auth */}
        <div className="hidden md:flex items-center gap-3">
          {!user ? (
            <>
              <Link href="/auth/login" className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors">
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-400 text-black text-sm font-semibold transition-all shadow-lg shadow-green-900/30"
              >
                Get Started
              </Link>
            </>
          ) : (
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 transition-all group"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-xs font-bold text-white">
                  {user.name.charAt(0)}
                </div>
                <span className="text-sm text-white font-medium">{user.name}</span>
                <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', profileOpen && 'rotate-180')} />
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-white/10 bg-black/90 backdrop-blur-xl shadow-2xl shadow-black/50 py-2 z-50">
                  {user.role === 'CUSTOMER' && (
                    <>
                      <Link href="/profile" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all">
                        <User className="w-4 h-4" /> My Profile
                      </Link>
                      <Link href="/profile/bookings" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all">
                        <CalendarCheck className="w-4 h-4" /> My Bookings
                      </Link>
                    </>
                  )}
                  {user.role === 'OWNER' && (
                    <Link href="/owner" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all">
                      <LayoutDashboard className="w-4 h-4" /> Owner Dashboard
                    </Link>
                  )}
                  <div className="border-t border-white/8 mt-1 pt-1">
                    <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-all">
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden p-2 rounded-xl hover:bg-white/5 transition-all"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/8 bg-black/90 backdrop-blur-xl px-6 py-4 space-y-1">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className="block px-4 py-3 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all">
              {l.label}
            </Link>
          ))}
          <div className="border-t border-white/8 pt-3 mt-3 flex flex-col gap-2">
            <Link href="/auth/login" className="block px-4 py-2.5 rounded-xl text-sm text-gray-300 hover:bg-white/5 transition-all text-center border border-white/10">
              Sign In
            </Link>
            <Link href="/auth/register" className="block px-4 py-2.5 rounded-xl bg-green-500 text-black text-sm font-semibold transition-all text-center">
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
