import { createAdminClient } from '../lib/supabase/admin'

async function run() {
  const supabase = createAdminClient()

  // Let's first count total bookings
  const { count, error: countErr } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })

  console.log('Total Bookings count in DB:', count, 'Error:', countErr)

  // Run the query as admin to see what it returns
  const { data, error } = await supabase.from('bookings').select(`
      id,
      total_amount,
      advance_paid,
      status,
      review_status,
      hidden_from_player,
      slots!inner(date, start_time, end_time),
      venues!inner(id, name, address, owner_id, areas(name), venue_images(url, is_cover)),
      booking_reviews(rating, feedback, ground_quality, lighting, cleanliness, staff_behaviour, value_for_money)
    `)

  console.log('Query result length:', data?.length)
  if (error) {
    console.error('Query error:', error)
  } else {
    console.log('Sample booking:', data?.[0])
  }
}

run()
