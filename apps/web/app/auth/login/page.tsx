'use client'

import { useState } from 'react'
import { Eye, EyeOff, Zap } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import ScrollExpandMedia from '@/components/ui/scroll-expansion-hero'

export default function LoginPage() {
  const supabase = createClient()
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const [isTransitioning, setIsTransitioning] = useState(false)
  const [targetDashboard, setTargetDashboard] = useState<string>('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })

    setLoading(false)

    if (signInError) {
      setError(signInError.message)
      return
    }

    if (data.session) {
      const role = data.session.user.user_metadata?.role
      let target = '/'
      if (role === 'ADMIN') {
        target = '/admin'
      } else if (role === 'OWNER') {
        target = '/owner'
      } else {
        target = '/'
      }
      setTargetDashboard(target)
      setIsTransitioning(true)
    }
  }

  const handleAnimationComplete = () => {
    router.push(targetDashboard)
  }

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#060d06] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background Image for Login Page */}
      <div className="absolute inset-0 z-0 opacity-20">
        <Image
          src="/images/turf-bg.png"
          alt="Turf Background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060d06] via-transparent to-[#060d06]/80" />
      </div>

      {/* Cinematic Transition Overlay */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <ScrollExpandMedia
              mediaType="image"
              mediaSrc="/images/turf-bg.png"
              bgImageSrc="/images/turf-bg.png"
              autoPlay={true}
              duration={2500}
              onComplete={handleAnimationComplete}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="w-full max-w-md space-y-6 relative z-10"
        initial={{ opacity: 1, scale: 1 }}
        animate={{ opacity: isTransitioning ? 0 : 1, scale: isTransitioning ? 0.95 : 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Decorative Background Element */}
        <div className="absolute -z-10 -top-20 -left-20 w-72 h-72 bg-green-500/20 rounded-full blur-[100px]" />
        <div className="absolute -z-10 -bottom-20 -right-20 w-72 h-72 bg-emerald-500/20 rounded-full blur-[100px]" />

        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center mx-auto shadow-xl shadow-green-900/40">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-gray-400 text-sm">Sign in to your TRUF GAMING account</p>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Email Address</label>
              <input
                type="email"
                required
                placeholder="arjun@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-green-500/50 transition-colors text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pr-11 text-white outline-none placeholder:text-gray-600 focus:border-green-500/50 transition-colors text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex justify-end mt-1">
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-green-400 hover:text-green-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || isTransitioning}
              className="w-full py-3.5 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-60 text-black font-bold transition-all shadow-lg shadow-green-900/30"
            >
              {loading ? 'Signing in...' : isTransitioning ? 'Preparing...' : 'Sign In'}
            </button>
          </form>

          <div className="relative text-center text-xs text-gray-600 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-[42%] before:h-px before:bg-white/8 after:content-[''] after:absolute after:right-0 after:top-1/2 after:w-[42%] after:h-px after:bg-white/8">
            or
          </div>

          <p className="text-center text-sm text-gray-400">
            Don&apos;t have an account?{' '}
            <Link
              href="/auth/register"
              className="text-green-400 hover:text-green-300 font-medium transition-colors"
            >
              Create one →
            </Link>
          </p>
        </div>
      </motion.div>
    </main>
  )
}
