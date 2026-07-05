import Link from 'next/link'
import { Frown } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#060d06] flex flex-col items-center justify-center text-center px-6 space-y-6">
      <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
        <Frown className="w-10 h-10 text-green-400" />
      </div>
      <div>
        <h1 className="text-7xl font-black text-white mb-2">404</h1>
        <h2 className="text-2xl font-semibold text-white mb-2">Page Not Found</h2>
        <p className="text-gray-400 max-w-sm">
          Looks like this venue has left the pitch. The page you&apos;re looking for doesn&apos;t exist.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/" className="px-6 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-black font-semibold transition-all">
          Back to Home
        </Link>
        <Link href="/venues" className="px-6 py-3 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-all">
          Browse Venues
        </Link>
      </div>
    </main>
  )
}
