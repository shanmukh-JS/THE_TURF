const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, key);

async function run() {
  console.log("Supabase URL:", url);
  
  // 1. Get all bookings
  const { data: bookings, error: bErr } = await supabase
    .from('bookings')
    .select('*');
    
  console.log("Total Bookings in DB:", bookings ? bookings.length : 0);
  if (bookings && bookings.length > 0) {
    console.log("First Booking example:", JSON.stringify(bookings[0], null, 2));
  }
  
  // 2. Check users
  const { data: profiles, error: pErr } = await supabase
    .from('customer_profiles')
    .select('*');
  console.log("Total customer profiles:", profiles ? profiles.length : 0);
  if (profiles) {
    console.log("Profiles list:", profiles.map(p => ({ user_id: p.user_id, name: p.name })));
  }
  
  // 3. Check auth users
  const { data: authUsers, error: auErr } = await supabase.auth.admin.listUsers();
  console.log("Total Auth Users:", authUsers ? authUsers.users.length : 0);
  if (authUsers) {
    console.log("Auth Users list:", authUsers.users.map(u => ({ id: u.id, email: u.email })));
  }
}

run();
