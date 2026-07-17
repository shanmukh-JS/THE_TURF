import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function run() {
  const { data: users, error } = await supabase.from('users').select('id, email')
  if (error) {
    console.error('Error fetching users:', error)
    return
  }
  if (!users || users.length === 0) {
    console.log('No users found in database')
    return
  }
  for (const u of users) {
    const { data: bookings, error: bError } = await supabase
      .from('bookings')
      .select('id, customer_id, venue_id, status')
      .eq('customer_id', u.id)
    if (bError) {
      console.error('Error fetching bookings for user', u.id, bError)
    } else {
      console.log(`User ${u.email} (ID: ${u.id}) has ${bookings?.length || 0} bookings.`)
    }
  }
}
run()
