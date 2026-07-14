'use client'

import { useState } from 'react'
import { Zap, User, Building2, Eye, EyeOff, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

type Role = 'CUSTOMER' | 'OWNER'

export default function RegisterPage() {
  const [role, setRole] = useState<Role>('CUSTOMER')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [error, setError] = useState<string | null>(null)

  // Passwords show/hide state
  const [showPass, setShowPass] = useState(false)

  // OTP States
  const [showOtp, setShowOtp] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const router = useRouter()

  // Cooldown timer logic
  const startCooldown = () => {
    setCooldown(30)
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!form.email.toLowerCase().endsWith('@gmail.com')) {
      setError('Only @gmail.com email addresses are allowed.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, role }),
      })
      const result = await res.json()

      if (!result.success) {
        setError(result.error?.message || 'Registration failed.')
        setLoading(false)
        return
      }

      setShowOtp(true)
      startCooldown()
    } catch (err) {
      setError('An error occurred during registration. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setVerifying(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, otp: otpCode, password: form.password }),
      })
      const result = await res.json()

      if (!result.success) {
        setError(result.error?.message || 'Verification failed.')
        setVerifying(false)
        return
      }

      // Successful registration & session auto-established
      const userRole = result.data?.user?.role || role
      if (userRole === 'ADMIN') {
        router.push('/admin')
      } else if (userRole === 'OWNER') {
        router.push('/owner')
      } else {
        router.push('/player')
      }
    } catch (err) {
      setError('An error occurred during OTP verification. Please try again.')
      setVerifying(false)
    }
  }

  const handleResendOtp = async () => {
    if (cooldown > 0) return
    setError(null)

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, purpose: 'registration' }),
      })
      const result = await res.json()

      if (!result.success) {
        setError(result.error?.message || 'Failed to resend verification code.')
        return
      }

      startCooldown()
    } catch (err) {
      setError('An error occurred. Please try again.')
    }
  }

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#060d06] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center mx-auto shadow-xl shadow-green-900/40">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            {showOtp ? 'Verify Your Identity' : 'Create your account'}
          </h1>
          <p className="text-gray-400 text-sm">
            {showOtp ? 'Verify OTP code sent to your email' : 'Join TURF GAMING in under 2 minutes'}
          </p>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6">
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 mb-4">
              {error}
            </div>
          )}

          {!showOtp ? (
            <>
              {/* Role Toggle */}
              <div className="flex gap-2 bg-white/5 rounded-xl p-1 border border-white/8 mb-6">
                {(
                  [
                    ['CUSTOMER', User, 'I want to play'],
                    ['OWNER', Building2, 'I own a venue'],
                  ] as [Role, LucideIcon, string][]
                ).map(([r, Icon, label]) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all',
                      role === r
                        ? 'bg-green-500 text-black shadow-lg'
                        : 'text-gray-400 hover:text-white'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {[
                  { field: 'name', label: 'Full Name', type: 'text', placeholder: 'Arjun Mehta' },
                  {
                    field: 'email',
                    label: 'Email Address',
                    type: 'email',
                    placeholder: 'arjun@example.com',
                    pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
                    title: 'Please enter a valid email address',
                  },
                  {
                    field: 'phone',
                    label: 'Phone Number',
                    type: 'tel',
                    placeholder: '9876543210',
                    pattern: '[0-9]{10}',
                    maxLength: 10,
                    minLength: 10,
                    title: 'Please enter exactly 10 digits',
                  },
                  {
                    field: 'password',
                    label: 'Password',
                    type: 'password',
                    placeholder: 'Min. 12 characters',
                    minLength: 12,
                  },
                ].map(
                  ({ field, label, type, placeholder, pattern, title, maxLength, minLength }) => (
                    <div key={field}>
                      <label className="block text-sm text-gray-400 mb-2">{label}</label>
                      <div className="relative">
                        <input
                          type={field === 'password' ? (showPass ? 'text' : 'password') : type}
                          required
                          placeholder={placeholder}
                          pattern={pattern}
                          title={title}
                          maxLength={maxLength}
                          minLength={minLength}
                          value={form[field as keyof typeof form]}
                          onChange={(e) => {
                            if (field === 'phone') {
                              const val = e.target.value.replace(/\D/g, '')
                              if (val.length <= 10) {
                                setForm({ ...form, [field]: val })
                              }
                            } else {
                              setForm({ ...form, [field]: e.target.value })
                            }
                          }}
                          className={cn(
                            'w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-green-500/50 transition-colors text-sm',
                            field === 'password' && 'pr-11'
                          )}
                        />
                        {field === 'password' && (
                          <button
                            type="button"
                            onClick={() => setShowPass(!showPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                          >
                            {showPass ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-60 text-black font-bold transition-all shadow-lg shadow-green-900/30 mt-6"
                >
                  {loading
                    ? 'Creating account...'
                    : role === 'OWNER'
                      ? 'Create Owner Account →'
                      : 'Create Account →'}
                </button>
              </form>
            </>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-gray-300">We've sent a 6-digit verification code to</p>
                <p className="text-sm text-green-400 font-semibold mt-1">{form.email}</p>
              </div>

              <div className="flex flex-col items-center gap-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Enter 6-Digit OTP
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-3xl tracking-[0.5em] font-mono bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-green-500/50 w-48"
                />
              </div>

              <div className="flex justify-between items-center text-xs">
                <button
                  type="button"
                  onClick={() => setShowOtp(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ← Edit Details
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={cooldown > 0}
                  className="text-green-400 hover:text-green-300 disabled:text-gray-500 transition-colors font-semibold"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
                </button>
              </div>

              <button
                type="submit"
                disabled={verifying || otpCode.length !== 6}
                className="w-full py-3.5 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-60 text-black font-bold transition-all shadow-lg shadow-green-900/30"
              >
                {verifying ? 'Verifying...' : 'Verify OTP →'}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-gray-400 mt-6">
            Already have an account?{' '}
            <Link
              href="/auth/login"
              className="text-green-400 hover:text-green-300 font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
