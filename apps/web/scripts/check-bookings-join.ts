import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function run() {
  const { data: users } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', 'shanmukhkadali3@gmail.com')
    .single()
  if (!users) {
    console.log('User not found')
    return
  }

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(
      `
      id,
      slots(id, date),
      venues(id, name, areas(name), venue_images(url))
    `
    )
    .eq('customer_id', users.id)

  if (error) {
    console.error('Error fetching bookings:', error)
  } else {
    console.log(JSON.stringify(bookings, null, 2))
  }
}
run()
