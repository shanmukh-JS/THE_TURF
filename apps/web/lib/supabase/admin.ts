import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(
      'WARNING: SUPABASE_SERVICE_ROLE_KEY is not defined. Falling back to ANON key. Database operations might fail RLS.'
    )
  }

  return createClient(supabaseUrl!, serviceKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
