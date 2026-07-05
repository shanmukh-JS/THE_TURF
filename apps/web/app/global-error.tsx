'use client'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#060d06] flex flex-col items-center justify-center text-center px-6 space-y-6">
        <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-red-400" />
        </div>
        <div>
          <h1 className="text-4xl font-black text-white mb-2">Something Went Wrong</h1>
          <p className="text-gray-400 max-w-sm">
            An unexpected error occurred. Our team has been notified. Please try again.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <p className="mt-3 text-xs text-red-400 font-mono bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2 max-w-sm mx-auto">
              {error.message}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={reset} className="px-6 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-black font-semibold transition-all">
            Try Again
          </button>
          <Link href="/" className="px-6 py-3 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-all">
            Back to Home
          </Link>
        </div>
      </body>
    </html>
  )
}
