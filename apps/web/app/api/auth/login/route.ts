import { NextRequest } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError } from '@/lib/email/validation'
import { rateLimitGuard } from '@/lib/utils/rateLimiter'

export async function POST(req: NextRequest) {
  try {
    const limitResponse = rateLimitGuard(req, 'login')
    if (limitResponse) return limitResponse

    const { email, password } = await req.json()

    if (!email || !password) {
      return apiError('MISSING_FIELDS', 'Email and password are required.')
    }

    const serverSupabase = await createServerClient()
    const { data, error } = await serverSupabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return apiError('INVALID_CREDENTIALS', error.message || 'Invalid email or password.')
    }

    return apiSuccess('Signed in successfully.', {
      session: data.session,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: data.user.user_metadata?.role || 'CUSTOMER',
        fullName: data.user.user_metadata?.full_name,
      },
    })
  } catch (err: any) {
    console.error('Login API Error:', err)
    return apiError('SERVER_ERROR', 'An unexpected server error occurred.')
  }
}
