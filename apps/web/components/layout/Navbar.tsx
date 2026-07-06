'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import {
  Zap,
  Menu,
  X,
  User,
  ChevronDown,
  LayoutDashboard,
  CalendarCheck,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

const navLinks = [
  { label: 'Browse Venues', href: '/venues' },
  { label: 'How it Works', href: '/#how-it-works' },
  { label: 'List Your Venue', href: '/owner/onboarding' },
]

import { useAuthStore } from '@/store/useAuthStore'

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const router = useRouter()

  const { user, logout } = useAuthStore()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [signingOut, setSigningOut] = useState(false)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    if (profileOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [profileOpen])

  const displayName = user?.fullName || user?.email?.split('@')[0] || 'User'

  return (
    <>
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="sticky top-0 z-50 w-full border-b border-white/8 bg-black/60 backdrop-blur-xl"
      >
        <div className="w-full px-4 h-16 flex items-center justify-between">
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
                <a
                  href="/auth/login"
                  className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
                >
                  Sign In
                </a>
                <a
                  href="/auth/register"
                  className="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-400 text-black text-sm font-semibold transition-all shadow-lg shadow-green-900/30"
                >
                  Get Started
                </a>
              </>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 transition-all group"
                >
                  {user.logoUrl ? (
                    <div className="w-7 h-7 rounded-full overflow-hidden border border-white/20">
                      <img src={user.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-xs font-bold text-white">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm text-white font-medium">{displayName}</span>
                  <ChevronDown
                    className={cn(
                      'w-4 h-4 text-gray-400 transition-transform',
                      profileOpen && 'rotate-180'
                    )}
                  />
                </button>
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-white/10 bg-black/90 backdrop-blur-xl shadow-2xl shadow-black/50 py-2 z-50">
                    {/* Customer-only links */}
                    {user.role === 'CUSTOMER' && (
                      <>
                        <Link
                          href="/profile"
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                        >
                          <User className="w-4 h-4" /> My Profile
                        </Link>
                        <Link
                          href="/profile/bookings"
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                        >
                          <CalendarCheck className="w-4 h-4" /> My Bookings
                        </Link>
                      </>
                    )}

                    {/* Role-specific dashboard link */}
                    {user.role === 'OWNER' && (
                      <Link
                        href="/owner"
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                      >
                        <LayoutDashboard className="w-4 h-4" /> Owner Dashboard
                      </Link>
                    )}
                    {user.role === 'ADMIN' && (
                      <Link
                        href="/admin"
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                      >
                        <LayoutDashboard className="w-4 h-4" /> Admin Dashboard
                      </Link>
                    )}

                    <div className="border-t border-white/8 mt-1 pt-1">
                      <button
                        onClick={async () => {
                          setProfileOpen(false)
                          setSigningOut(true)
                          // Wait for fade-in animation
                          await new Promise((r) => setTimeout(r, 500))
                          await logout()
                          router.push('/auth/login')
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-all"
                      >
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
            {mobileOpen ? (
              <X className="w-5 h-5 text-white" />
            ) : (
              <Menu className="w-5 h-5 text-white" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-white/8 bg-black/90 backdrop-blur-xl px-6 py-4 space-y-1">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-3 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all"
              >
                {l.label}
              </Link>
            ))}
            <div className="border-t border-white/8 pt-3 mt-3 flex flex-col gap-2">
              <Link
                href="/auth/login"
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-2.5 rounded-xl text-sm text-gray-300 hover:bg-white/5 transition-all text-center border border-white/10"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-2.5 rounded-xl bg-green-500 text-black text-sm font-semibold transition-all text-center"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </motion.header>

      {/* Smooth sign-out overlay — fades to black before redirect */}
      <div
        className="fixed inset-0 z-[9999] bg-black pointer-events-none transition-opacity duration-500"
        style={{ opacity: signingOut ? 1 : 0 }}
      />
    </>
  )
}
