import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function testQuery() {
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: bookingsData, error } = await adminClient
    .from('bookings')
    .select(
      `
        *,
        users(email),
        venues(name, owner_profiles(full_name)),
        slots(date, start_time, end_time)
      `
    )
    .limit(1)

  console.log('Error:', error)
  console.log('Data:', bookingsData)
}

testQuery()
