import { beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

// In a real environment, this would point to the CERTIFICATION database
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

beforeAll(async () => {
  console.log('[Setup] Connecting to Certification Database...')
  // This would typically reset the schema and seed synthetic data
})

afterAll(async () => {
  console.log('[Teardown] Cleaning up Certification Database...')
})

export { supabase }
