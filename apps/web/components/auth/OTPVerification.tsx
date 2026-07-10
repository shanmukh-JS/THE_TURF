'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowRight, MessageCircle, ShieldCheck, Loader2 } from 'lucide-react'

export function OTPVerification() {
  const router = useRouter()
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)

  const supabase = createClient()

  // Cooldown timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (cooldown > 0) {
      interval = setInterval(() => setCooldown((c) => c - 1), 1000)
    }
    return () => clearInterval(interval)
  }, [cooldown])

  const handleSendOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}` // Default to +91 if none provided
      const res = await fetch('/api/auth/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP')

      setPhone(formattedPhone)
      setStep('OTP')
      setCooldown(60)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/whatsapp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to verify OTP')

      // Set the session returned from our API
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })

      if (sessionError) throw sessionError

      // Redirect based on role (could be enhanced)
      router.push('/profile')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto p-8 rounded-2xl bg-black/40 border border-green-500/20 backdrop-blur-md shadow-2xl">
      <div className="flex justify-center mb-6">
        <div className="p-3 bg-green-500/10 rounded-full border border-green-500/30">
          <MessageCircle className="w-8 h-8 text-green-400" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-center text-white mb-2">WhatsApp Login</h2>
      <p className="text-center text-gray-400 mb-8 text-sm">
        {step === 'PHONE'
          ? 'Enter your mobile number to receive a secure code.'
          : `We sent a code to ${phone}`}
      </p>

      {error && (
        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      {step === 'PHONE' ? (
        <form onSubmit={handleSendOTP} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Mobile Number</label>
            <div className="flex relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">+91</span>
              <input
                type="tel"
                value={phone.replace(/^\+91/, '')}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all text-white outline-none"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Code'}
            {!loading && <ArrowRight className="w-5 h-5" />}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOTP} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 text-center">
              Enter 6-Digit Code
            </label>
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full text-center tracking-[0.5em] text-2xl py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all text-white outline-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Login'}
            {!loading && <ShieldCheck className="w-5 h-5" />}
          </button>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => handleSendOTP()}
              disabled={cooldown > 0 || loading}
              className="text-sm text-green-400 hover:text-green-300 disabled:text-gray-500 transition-colors"
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
