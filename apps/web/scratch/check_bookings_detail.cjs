const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, key);

async function run() {
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, customer_id, slot_id, venue_id');
  console.log("Bookings:", bookings);
}

run();
