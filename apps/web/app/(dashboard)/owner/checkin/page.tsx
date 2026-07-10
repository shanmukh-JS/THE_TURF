'use client'

import { useState } from 'react'
import { QrCode, ShieldCheck, UserCheck, AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function CheckinScannerPage() {
  const [code, setCode] = useState('')
  const [scanning, setScanning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/bookings/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode: code.trim() }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Check-in validation failed')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#060d06] text-white p-6 max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/owner"
          className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">QR Ticket Check-in</h1>
          <p className="text-xs text-gray-400">
            Scan or enter the player ticket code to check them in.
          </p>
        </div>
      </div>

      {/* Simulated Scanner / Visual Element */}
      <div className="relative aspect-square max-w-sm mx-auto rounded-3xl border border-white/10 overflow-hidden bg-black/40 flex flex-col items-center justify-center p-8 group shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.05),transparent_60%)]" />

        {/* Laser animation */}
        <div className="absolute left-0 right-0 h-0.5 bg-green-500 shadow-md shadow-green-500 animate-pulse top-1/2 -translate-y-1/2" />

        <div className="w-40 h-40 border-2 border-dashed border-green-500/30 rounded-2xl flex items-center justify-center relative">
          <QrCode className="w-20 h-20 text-green-500/40 animate-pulse" />
          <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-green-500" />
          <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-green-500" />
          <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-green-500" />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-green-500" />
        </div>

        <p className="text-[10px] text-gray-500 mt-6 uppercase tracking-wider font-semibold animate-pulse">
          Ready to Scan / Enter Code
        </p>
      </div>

      {/* Manual Code Input Form */}
      <form onSubmit={handleScanSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Ticket Code / QR Token
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="e.g. 5d928a3f..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50 transition-all font-mono"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-green-950/20"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserCheck className="w-4 h-4" />
              )}
              Verify
            </button>
          </div>
        </div>
      </form>

      {/* Outcome Cards */}
      {error && (
        <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 flex gap-4 items-start">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-white text-sm">Check-in Failed</h4>
            <p className="text-xs text-gray-400 mt-1">{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div className="p-5 rounded-2xl bg-green-500/10 border border-green-500/20 space-y-4">
          <div className="flex gap-4 items-start">
            <ShieldCheck className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-white text-sm">
                {result.alreadyCheckedIn ? 'Checked-in Already' : 'Checked-in Successfully!'}
              </h4>
              <p className="text-xs text-gray-400 mt-1">
                {result.alreadyCheckedIn
                  ? 'This ticket has already been marked present.'
                  : 'The player has been checked in for the booking.'}
              </p>
            </div>
          </div>

          <div className="border-t border-white/5 pt-4 grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-gray-500 block uppercase tracking-wider text-[9px]">Venue</span>
              <span className="text-white font-medium">
                {result.booking?.venues?.name || 'Olympia Turf'}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block uppercase tracking-wider text-[9px]">
                Amount Due
              </span>
              <span className="text-white font-medium">₹{result.booking?.total_amount}</span>
            </div>
            <div>
              <span className="text-gray-500 block uppercase tracking-wider text-[9px]">
                Status
              </span>
              <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 font-bold uppercase text-[9px]">
                {result.booking?.status}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block uppercase tracking-wider text-[9px]">
                Match Date
              </span>
              <span className="text-white font-medium">{result.booking?.slots?.date}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
