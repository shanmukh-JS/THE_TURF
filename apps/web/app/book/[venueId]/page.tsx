'use client'

import { useState, use, useEffect } from 'react'
import {
  CheckCircle,
  CreditCard,
  Calendar,
  User,
  ChevronRight,
  Lock,
  ArrowLeft,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const steps = [
  { id: 1, label: 'Select Slot', icon: Calendar },
  { id: 2, label: 'Your Details', icon: User },
  { id: 3, label: 'Payment', icon: CreditCard },
  { id: 4, label: 'Confirmed', icon: CheckCircle },
]

// Mock slots for the UI as per existing implementation, but now integrating with backend locking
const availableSlots = [
  {
    id: '2c332560-eb28-466d-a164-9a1bf185c709',
    time: '7:00 PM – 8:00 PM',
    price: 1200,
    available: true,
  },
  {
    id: '2c332560-eb28-466d-a164-9a1bf185c710',
    time: '8:00 PM – 9:00 PM',
    price: 1200,
    available: false,
  },
  {
    id: '2c332560-eb28-466d-a164-9a1bf185c711',
    time: '9:00 PM – 10:00 PM',
    price: 1200,
    available: true,
  },
]

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function BookingWizard({ params }: { params: Promise<{ venueId: string }> }) {
  const { venueId } = use(params)
  const [step, setStep] = useState(1)
  const [selectedSlot, setSelectedSlot] = useState<(typeof availableSlots)[0] | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [details, setDetails] = useState({ name: '', phone: '', players: '6' })
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null)

  const venueName = 'Olympia Turf'
  const advanceAmount = selectedSlot ? Math.round(selectedSlot.price * 0.5) : 0

  useEffect(() => {
    loadRazorpayScript()
  }, [])

  const handlePay = async () => {
    if (!selectedSlot || !agreed) return
    setLoading(true)
    setError(null)

    try {
      // 1. Call Backend to Start Checkout (Locks slot and creates Razorpay Order)
      const checkoutRes = await fetch('/api/bookings/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: selectedSlot.id,
          venueId: venueId,
          totalAmount: selectedSlot.price,
          advancePaid: advanceAmount,
        }),
      })

      const checkoutData = await checkoutRes.json()

      if (!checkoutRes.ok) {
        throw new Error(checkoutData.error || 'Failed to initialize checkout')
      }

      const { order } = checkoutData

      // 2. Open Razorpay Checkout Modal
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, // Use Razorpay Key ID
        amount: order.amount,
        currency: order.currency,
        name: 'TRUF GAMING',
        description: `Advance Payment for ${venueName}`,
        order_id: order.orderId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handler: async function (response: any) {
          try {
            setLoading(true)
            // Payment successful on client side.
            // We NO LONGER call /api/bookings/verify from the client.
            // The Razorpay webhook (order.paid / payment.authorized) will handle backend verification and booking confirmation securely.

            // Move to Confirmed screen
            setConfirmedBookingId('Processing via Webhook')
            setStep(4)
          } catch (err: any) {
            setError(err.message || 'An error occurred. Please contact support.')
          } finally {
            setLoading(false)
          }
        },
        prefill: {
          name: details.name,
          contact: details.phone,
        },
        theme: {
          color: '#22c55e', // Tailwind green-500
        },
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp = new (window as any).Razorpay(options)
      rzp.on('payment.failed', function (response: any) {
        setError(`Payment Failed: ${response.error.description}`)
        setLoading(false)
      })
      rzp.open()
    } catch (err: any) {
      setError(err.message || 'An error occurred while starting checkout.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#060d06] text-white flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-2xl mb-6">
        <a
          href={`/venues/${venueId}`}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to {venueName}
        </a>
      </div>

      <div className="w-full max-w-2xl mb-8">
        <div className="flex items-center justify-between relative">
          <div className="absolute top-5 left-0 right-0 h-px bg-white/10 z-0" />
          {steps.map((s) => {
            const Icon = s.icon
            const done = step > s.id
            const active = step === s.id
            return (
              <div key={s.id} className="flex flex-col items-center gap-2 z-10">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                    done
                      ? 'bg-green-500 border-green-500'
                      : active
                        ? 'bg-green-500/20 border-green-500'
                        : 'bg-[#060d06] border-white/20'
                  )}
                >
                  <Icon
                    className={cn('w-4 h-4', done || active ? 'text-green-300' : 'text-gray-500')}
                  />
                </div>
                <span
                  className={cn('text-xs font-medium', active ? 'text-white' : 'text-gray-500')}
                >
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="w-full max-w-2xl">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 space-y-6">
            <h2 className="text-xl font-bold">Select a Date & Time Slot</h2>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-green-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-3">Available Slots</label>
              <div className="grid grid-cols-2 gap-3">
                {availableSlots.map((slot) => (
                  <button
                    key={slot.id}
                    disabled={!slot.available}
                    onClick={() => setSelectedSlot(slot)}
                    className={cn(
                      'p-4 rounded-xl border text-left transition-all',
                      !slot.available
                        ? 'opacity-40 cursor-not-allowed border-white/5 bg-white/5'
                        : selectedSlot?.id === slot.id
                          ? 'border-green-500 bg-green-500/15 shadow-lg shadow-green-900/20'
                          : 'border-white/10 bg-white/5 hover:border-green-500/40 hover:bg-white/8'
                    )}
                  >
                    <p className="text-sm font-semibold text-white">{slot.time}</p>
                    <p className="text-xs text-gray-400 mt-1">₹{slot.price}/hr</p>
                    {!slot.available && <p className="text-xs text-red-400 mt-1">Booked</p>}
                  </button>
                ))}
              </div>
            </div>
            <button
              disabled={!selectedSlot || !selectedDate}
              onClick={() => setStep(2)}
              className="w-full py-3.5 rounded-xl bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-green-400 text-black font-bold transition-all"
            >
              Continue <ChevronRight className="inline w-4 h-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 space-y-5">
            <h2 className="text-xl font-bold">Your Details</h2>
            {['name', 'phone'].map((field) => (
              <div key={field}>
                <label className="block text-sm text-gray-400 mb-2 capitalize">
                  {field === 'phone' ? 'Phone Number' : 'Full Name'}
                </label>
                <input
                  type={field === 'phone' ? 'tel' : 'text'}
                  placeholder={field === 'phone' ? '+91 98765 43210' : 'Arjun Mehta'}
                  value={details[field as keyof typeof details]}
                  onChange={(e) => setDetails({ ...details, [field]: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-green-500/50 transition-colors"
                />
              </div>
            ))}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Number of Players</label>
              <select
                value={details.players}
                onChange={(e) => setDetails({ ...details, players: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-green-500/50 appearance-none"
              >
                {[2, 4, 6, 8, 10, 12].map((n) => (
                  <option key={n} className="text-black">
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-gray-300 hover:border-white/20 transition-colors"
              >
                ← Back
              </button>
              <button
                disabled={!details.name || !details.phone}
                onClick={() => setStep(3)}
                className="flex-1 py-3 rounded-xl bg-green-500 disabled:opacity-40 hover:bg-green-400 text-black font-bold transition-all"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {step === 3 && selectedSlot && (
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 space-y-5">
            <h2 className="text-xl font-bold">Confirm & Pay</h2>
            <div className="rounded-xl border border-white/8 bg-black/30 p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Venue</span>
                <span>{venueName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Date</span>
                <span>{selectedDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Slot</span>
                <span>{selectedSlot.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Players</span>
                <span>{details.players}</span>
              </div>
              <div className="border-t border-white/8 pt-3 mt-2">
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span>₹{selectedSlot.price}</span>
                </div>
                <div className="flex justify-between text-green-400 mt-1">
                  <span>Advance (50% due now)</span>
                  <span>₹{advanceAmount}</span>
                </div>
              </div>
            </div>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 accent-green-500"
              />
              <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                I agree to the venue rules and Terms of Service.
              </span>
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                disabled={loading}
                className="flex-1 py-3 rounded-xl border border-white/10 text-gray-300 hover:border-white/20 transition-colors disabled:opacity-40"
              >
                ← Back
              </button>
              <button
                disabled={!agreed || loading}
                onClick={handlePay}
                className="flex-1 py-3.5 flex items-center justify-center gap-2 rounded-xl bg-green-500 disabled:opacity-40 hover:bg-green-400 text-black font-bold transition-all shadow-lg shadow-green-900/30"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : `Pay ₹${advanceAmount} →`}
              </button>
            </div>
          </div>
        )}

        {step === 4 && selectedSlot && (
          <div className="rounded-2xl border border-green-500/30 bg-green-500/5 p-8 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500/40 flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Booking Confirmed! 🏏</h2>
            <p className="text-gray-400">
              Your slot at <strong className="text-white">{venueName}</strong> on{' '}
              <strong className="text-white">{selectedDate}</strong> at{' '}
              <strong className="text-white">{selectedSlot.time}</strong> is confirmed.
            </p>
            <div className="inline-block px-4 py-2 rounded-xl bg-black/40 border border-green-500/20 font-mono text-green-400 text-sm font-bold tracking-widest">
              BOOKING ID:{' '}
              {confirmedBookingId?.slice(0, 8).toUpperCase() ||
                `TG${Date.now().toString().slice(-6)}`}
            </div>
            <div className="flex gap-3 justify-center mt-4">
              <Link
                href="/player/bookings"
                className="px-6 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:border-white/20 text-sm transition-colors"
              >
                View My Bookings
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
