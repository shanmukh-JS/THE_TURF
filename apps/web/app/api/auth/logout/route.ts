import { NextRequest } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError } from '@/lib/email/validation'

export async function POST(req: NextRequest) {
  try {
    const serverSupabase = await createServerClient()
    const { error } = await serverSupabase.auth.signOut()

    if (error) {
      return apiError('LOGOUT_FAILED', error.message || 'Failed to sign out.')
    }

    return apiSuccess('Signed out successfully.')
  } catch (err: any) {
    console.error('Logout API Error:', err)
    return apiError('SERVER_ERROR', 'An unexpected server error occurred.')
  }
}
