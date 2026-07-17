const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, key);

async function run() {
  // Let's get a booking
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, customer_id, slot_id, venue_id');
    
  for (const b of bookings) {
    const { data: slot } = await supabase.from('slots').select('*').eq('id', b.slot_id).maybeSingle();
    const { data: venue } = await supabase.from('venues').select('*').eq('id', b.venue_id).maybeSingle();
    console.log(`Booking ${b.id}:`);
    console.log(`  - Slot ID ${b.slot_id} exists:`, !!slot);
    console.log(`  - Venue ID ${b.venue_id} exists:`, !!venue);
  }
}

run();
