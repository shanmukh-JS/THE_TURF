import { createBrowserClient } from '@supabase/ssr'
// import type { Database } from '@repo/types/supabase' // Uncomment once types are generated

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
