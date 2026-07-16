import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function run() {
  // Check if booking_reviews has ground_quality column by trying to select it
  const { data, error } = await supabase
    .from('booking_reviews')
    .select('id, ground_quality, lighting, cleanliness, staff_behaviour, value_for_money')
    .limit(1)

  console.log('=== BOOKING_REVIEWS CATEGORY COLUMNS ===')
  if (error) {
    console.error('Error (columns missing):', error.message)
  } else {
    console.log('Category columns exist! Data:', data)
  }

  // Try a test insert into booking_reviews to see what happens
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, customer_id, venue_id, status')
    .eq('status', 'COMPLETED')
    .limit(1)
    .single()

  console.log('\n=== TEST BOOKING ===')
  console.log(JSON.stringify(booking, null, 2))

  if (booking) {
    // Try inserting a test review (we'll delete it after)
    const { error: insertErr } = await supabase.from('booking_reviews').insert({
      booking_id: booking.id,
      player_id: booking.customer_id,
      turf_id: booking.venue_id,
      rating: 4,
      feedback: 'Test review for debugging purposes only',
      review_source: 'player',
      review_time: 10,
      booking_duration: 60,
      review_sentiment: 'POSITIVE',
      device_type: 'desktop',
      ground_quality: 4,
      lighting: 4,
      cleanliness: 5,
      staff_behaviour: 5,
      value_for_money: 5,
    })

    if (insertErr) {
      console.error('\n=== INSERT ERROR ===')
      console.error(insertErr)
    } else {
      console.log('\n=== INSERT SUCCESS ===')
      // Clean up the test
      await supabase.from('booking_reviews').delete().eq('booking_id', booking.id)
      console.log('Test review deleted.')
    }
  }

  // Check venue_ratings table columns
  const { data: vr, error: vrErr } = await supabase.from('venue_ratings').select('*').limit(1)

  console.log('\n=== VENUE_RATINGS TABLE ===')
  if (vrErr) {
    console.error('Error:', vrErr.message)
  } else {
    console.log('Columns:', vr?.[0] ? Object.keys(vr[0]) : 'NO ROWS / table exists')
  }

  // Check notification_logs
  const { data: nl, error: nlErr } = await supabase.from('notification_logs').select('*').limit(1)

  console.log('\n=== NOTIFICATION_LOGS TABLE ===')
  if (nlErr) {
    console.error('Error:', nlErr.message)
  } else {
    console.log('Columns:', nl?.[0] ? Object.keys(nl[0]) : 'NO ROWS / table exists')
  }

  // Check reviews table
  const { data: revs, error: revsErr } = await supabase.from('reviews').select('*').limit(1)

  console.log('\n=== REVIEWS TABLE ===')
  if (revsErr) {
    console.error('Error:', revsErr.message)
  } else {
    console.log('Columns:', revs?.[0] ? Object.keys(revs[0]) : 'NO ROWS / table exists')
  }
}

run()
