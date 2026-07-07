'use client'

import { useState, useEffect } from 'react'
import { Zap, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetToken, setResetToken] = useState('')

  // Show/Hide password states
  const [showNewPass, setShowNewPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  // Password strength checks
  const [strength, setStrength] = useState<'Weak' | 'Medium' | 'Strong'>('Weak')
  const [checks, setChecks] = useState({
    length: false,
    upper: false,
    lower: false,
    number: false,
    special: false,
    notCommon: false,
  })

  // Cooldown timer
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

  // Live password strength validator
  useEffect(() => {
    const isLength = password.length >= 12
    const isUpper = /[A-Z]/.test(password)
    const isLower = /[a-z]/.test(password)
    const isNumber = /[0-9]/.test(password)
    const isSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)

    const weakDictionary = ['12345678', 'password123', 'qwerty', 'trufgaming123', 'welcome123']
    const isNotCommon = !weakDictionary.some((weak) => password.toLowerCase().includes(weak))

    setChecks({
      length: isLength,
      upper: isUpper,
      lower: isLower,
      number: isNumber,
      special: isSpecial,
      notCommon: isNotCommon,
    })

    const criteriaMet = [isLength, isUpper, isLower, isNumber, isSpecial, isNotCommon].filter(
      Boolean
    ).length

    if (criteriaMet <= 3) {
      setStrength('Weak')
    } else if (criteriaMet <= 5) {
      setStrength('Medium')
    } else {
      setStrength('Strong')
    }
  }, [password])

  // Form handlers
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const result = await res.json()

      if (!result.success) {
        setError(result.error?.message || 'Failed to send recovery code.')
        return
      }

      setStep(2)
      startCooldown()
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/verify-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpCode }),
      })
      const result = await res.json()

      if (!result.success) {
        setError(result.error?.message || 'OTP verification failed.')
        return
      }

      setResetToken(result.data.resetToken)
      setStep(3)
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (cooldown > 0) return
    setError(null)

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose: 'forgot_password' }),
      })
      const result = await res.json()

      if (!result.success) {
        setError(result.error?.message || 'Failed to resend code.')
        return
      }

      startCooldown()
    } catch {
      setError('An error occurred. Please try again.')
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (strength !== 'Strong') {
      setError('Please choose a stronger password matching all safety parameters.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, password }),
      })
      const result = await res.json()

      if (!result.success) {
        setError(result.error?.message || 'Failed to reset password.')
        return
      }

      setStep(4)
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
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
            {step === 1 && 'Reset Password'}
            {step === 2 && 'Verify Your Identity'}
            {step === 3 && 'Choose New Password'}
            {step === 4 && 'Recovery Complete'}
          </h1>
          <p className="text-gray-400 text-sm">
            {step === 1 && 'Enter your email to receive a recovery code'}
            {step === 2 && 'Enter the code sent to your email'}
            {step === 3 && 'Choose a secure, strong password'}
            {step === 4 && 'Your password has been successfully updated'}
          </p>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6">
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 mb-4 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="arjun@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-green-500/50 transition-colors text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-3.5 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-60 text-black font-bold transition-all shadow-lg shadow-green-900/30 mt-2"
              >
                {loading ? 'Sending code...' : 'Continue →'}
              </button>

              <p className="text-center text-sm text-gray-400 mt-4">
                Remember your password?{' '}
                <Link
                  href="/auth/login"
                  className="text-green-400 hover:text-green-300 transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-gray-300">We've sent a 6-digit recovery code to</p>
                <p className="text-sm text-green-400 font-semibold mt-1">{email}</p>
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
                  onClick={() => setStep(1)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ← Back
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
                disabled={loading || otpCode.length !== 6}
                className="w-full py-3.5 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-60 text-black font-bold transition-all shadow-lg shadow-green-900/30"
              >
                {loading ? 'Verifying...' : 'Verify Code →'}
              </button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    placeholder="Min. 12 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pr-11 text-white outline-none placeholder:text-gray-600 focus:border-green-500/50 transition-colors text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    required
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pr-11 text-white outline-none placeholder:text-gray-600 focus:border-green-500/50 transition-colors text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-3 p-4 bg-white/5 border border-white/10 rounded-xl">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Password Strength:</span>
                  <span
                    className={cn(
                      'font-bold uppercase tracking-wider',
                      strength === 'Weak' && 'text-red-400',
                      strength === 'Medium' && 'text-yellow-400',
                      strength === 'Strong' && 'text-green-400'
                    )}
                  >
                    {strength}
                  </span>
                </div>

                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all duration-300',
                      strength === 'Weak' && 'w-1/3 bg-red-400',
                      strength === 'Medium' && 'w-2/3 bg-yellow-400',
                      strength === 'Strong' && 'w-full bg-green-500'
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10px] text-gray-400 pt-1">
                  <div
                    className={cn(
                      'flex items-center gap-1',
                      checks.length ? 'text-green-400' : 'text-gray-500'
                    )}
                  >
                    <span>{checks.length ? '✓' : '•'}</span> At least 12 chars
                  </div>
                  <div
                    className={cn(
                      'flex items-center gap-1',
                      checks.upper ? 'text-green-400' : 'text-gray-500'
                    )}
                  >
                    <span>{checks.upper ? '✓' : '•'}</span> One uppercase letter
                  </div>
                  <div
                    className={cn(
                      'flex items-center gap-1',
                      checks.lower ? 'text-green-400' : 'text-gray-500'
                    )}
                  >
                    <span>{checks.lower ? '✓' : '•'}</span> One lowercase letter
                  </div>
                  <div
                    className={cn(
                      'flex items-center gap-1',
                      checks.number ? 'text-green-400' : 'text-gray-500'
                    )}
                  >
                    <span>{checks.number ? '✓' : '•'}</span> One number
                  </div>
                  <div
                    className={cn(
                      'flex items-center gap-1',
                      checks.special ? 'text-green-400' : 'text-gray-500'
                    )}
                  >
                    <span>{checks.special ? '✓' : '•'}</span> One special character
                  </div>
                  <div
                    className={cn(
                      'flex items-center gap-1',
                      checks.notCommon ? 'text-green-400' : 'text-gray-500'
                    )}
                  >
                    <span>{checks.notCommon ? '✓' : '•'}</span> Not generic pattern
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || strength !== 'Strong' || password !== confirmPassword}
                className="w-full py-3.5 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-60 text-black font-bold transition-all shadow-lg shadow-green-900/30"
              >
                {loading ? 'Resetting password...' : 'Reset Password →'}
              </button>
            </form>
          )}

          {step === 4 && (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto border border-green-500/20">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">Password Updated Successfully</h3>
                <p className="text-sm text-gray-400">
                  Your new password is now active. Please sign in to access your account.
                </p>
              </div>

              <Link
                href="/auth/login"
                className="block w-full py-3.5 rounded-xl bg-green-500 hover:bg-green-400 text-black text-center font-bold transition-all shadow-lg shadow-green-900/30 text-sm"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
