'use client'

import { useState } from 'react'
import { Zap, User, Building2, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

type Role = 'CUSTOMER' | 'OWNER'

export default function RegisterPage() {
  const supabase = createClient()
  const [role, setRole] = useState<Role>('CUSTOMER')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.name,
          role: role,
        },
      },
    })

    setLoading(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    if (data.session) {
      // User created and logged in automatically (if email confirmation is off)
      const userRole = data.session.user.user_metadata?.role || role
      if (userRole === 'ADMIN') {
        router.push('/admin')
      } else if (userRole === 'OWNER') {
        router.push('/owner')
      } else {
        router.push('/player')
      }
    } else {
      setError('Registration successful! Please check your email to confirm.')
    }
  }

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#060d06] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center mx-auto shadow-xl shadow-green-900/40">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="text-gray-400 text-sm">Join TURF GAMING in under 2 minutes</p>
        </div>

        {/* Role Toggle */}
        <div className="flex gap-2 bg-white/5 rounded-xl p-1 border border-white/8">
          {(
            [
              ['CUSTOMER', User, 'I want to play'],
              ['OWNER', Building2, 'I own a venue'],
            ] as [Role, LucideIcon, string][]
          ).map(([r, Icon, label]) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all',
                role === r ? 'bg-green-500 text-black shadow-lg' : 'text-gray-400 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { field: 'name', label: 'Full Name', type: 'text', placeholder: 'Arjun Mehta' },
              {
                field: 'email',
                label: 'Email Address',
                type: 'email',
                placeholder: 'arjun@example.com',
              },
              {
                field: 'phone',
                label: 'Phone Number',
                type: 'tel',
                placeholder: '+91 98765 43210',
              },
              {
                field: 'password',
                label: 'Password',
                type: 'password',
                placeholder: 'Min. 8 characters',
              },
            ].map(({ field, label, type, placeholder }) => (
              <div key={field}>
                <label className="block text-sm text-gray-400 mb-2">{label}</label>
                <input
                  type={type}
                  required
                  placeholder={placeholder}
                  value={form[field as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-green-500/50 transition-colors text-sm"
                />
              </div>
            ))}

            {role === 'OWNER' && (
              <div className="rounded-xl bg-green-500/5 border border-green-500/20 px-4 py-3 text-sm text-green-300">
                🏏 After registration, you&apos;ll complete KYC verification before listing your
                venue.
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-60 text-black font-bold transition-all shadow-lg shadow-green-900/30"
            >
              {loading
                ? 'Creating account...'
                : role === 'OWNER'
                  ? 'Create Owner Account →'
                  : 'Create Account →'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-4">
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
