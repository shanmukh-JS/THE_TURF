const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = 'https://geyfizvpwotkfmbhoytg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdleWZpenZwd290a2ZtYmhveXRnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzI3NTgyMCwiZXhwIjoyMDk4ODUxODIwfQ.dqIVvJXWp7IpcqXSSUIZiGLEEJHiTxRd3MY_rTw3j3Q';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const VENUE_ID = 'f8c4ec16-05ae-4b92-addb-50936b17ee24';
const OWNER_ID = '19cb4f48-e3b9-4d69-8192-d4b8d0b29f50';
const OWNER_USER_ID = '7acaf255-4ecb-4b08-ad9d-fca72722a710';

async function seed() {
  console.log('Starting seed step 2 (ratings and notifications)...');

  const { data: bookings } = await supabase.from('bookings').select('id, customer_id').eq('venue_id', VENUE_ID).limit(2);
  
  if (bookings && bookings.length > 0) {
    console.log('Creating venue_ratings for bookings...');
    const ratings = bookings.map((b, idx) => ({
      id: crypto.randomUUID(),
      booking_id: b.id,
      user_id: b.customer_id,
      overall_rating: idx === 0 ? 5 : 4,
      ground_quality: 5,
      lighting: idx === 0 ? 5 : 4,
      staff_behaviour: 5,
      cleanliness: 4,
      value_for_money: 5,
      comments: idx === 0 ? 'Amazing turf! The grass quality is top notch.' : 'Good experience overall.',
      sentiment: 'POSITIVE',
      sentiment_breakdown: { pitch: 'positive', lighting: 'positive' }
    }));
    
    const { error: rError } = await supabase.from('venue_ratings').insert(ratings);
    if(rError) console.error('Error inserting ratings:', rError);
    else console.log('Ratings inserted successfully!');
  }

  console.log('Creating notifications (UI structure)...');
  const notifications = [
    {
      id: crypto.randomUUID(),
      user_id: OWNER_USER_ID,
      title: 'New Booking Confirmed',
      message: 'Mock Customer has booked your turf for today at 6 PM.',
      type: 'BOOKING',
      is_read: false
    },
    {
      id: crypto.randomUUID(),
      user_id: OWNER_USER_ID,
      title: 'Payment Received',
      message: 'A payment of ₹1500 was successfully processed.',
      type: 'SUCCESS',
      is_read: false
    }
  ];
  
  const { error: nError } = await supabase.from('notifications').insert(notifications);
  if(nError) console.error('Error inserting notifications:', nError);
  else console.log('Notifications inserted successfully!');
}

seed().catch(console.error);
