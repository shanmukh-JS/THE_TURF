'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App Runtime Error:', error)
  }, [error])

  return (
    <div className="min-h-[70vh] bg-[#060d06] flex flex-col items-center justify-center text-center px-6 space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-amber-400" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white">Something went wrong!</h2>
        <p className="text-gray-400 text-sm max-w-md">
          An unexpected error occurred while loading this page. You can try refreshing or returning to the dashboard.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => reset()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-black font-semibold text-sm transition-all"
        >
          <RotateCcw className="w-4 h-4" /> Try Again
        </button>
        <Link
          href="/"
          className="px-5 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:border-white/20 text-sm transition-all"
        >
          Go Home
        </Link>
      </div>
    </div>
  )
}
