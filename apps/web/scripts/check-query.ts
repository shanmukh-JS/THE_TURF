import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function run() {
  // Let's authenticate as shanmukhkadali3@gmail.com
  // Wait, I can't do that without their password or token.
  // BUT I can query as ANON and see the error message if any schema is wrong!

  const { data, error } = await supabase
    .from('bookings')
    .select(
      `
      id,
      slots!inner(date, start_time, end_time),
      venues!inner(id, name, address, owner_id, areas(name), venue_images(url, is_cover)),
      booking_reviews(rating, feedback, ground_quality, lighting, cleanliness, staff_behaviour, value_for_money)
    `
    )
    .eq('customer_id', '54c533ae-e8f8-4fb0-b8d1-deb30cf93a2e')

  if (error) {
    console.error('ERROR:', error)
  } else {
    console.log('SUCCESS:', data)
  }
}
run()
