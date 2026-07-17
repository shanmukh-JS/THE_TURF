const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  const anonSupabase = createClient(url, anonKey);
  const serviceSupabase = createClient(url, serviceKey);

  // 1. Service role query
  const { data: bService, error: eService } = await serviceSupabase
    .from('bookings')
    .select('id, customer_id');
  console.log("Service Role found bookings count:", bService ? bService.length : 0);

  // 2. Anon role query (simulating guest)
  const { data: bAnon, error: eAnon } = await anonSupabase
    .from('bookings')
    .select('id, customer_id');
  console.log("Anon Client found bookings count:", bAnon ? bAnon.length : 0, "Error:", eAnon);

  // 3. User session query simulation (using authorization header)
  // Let's check if the anon client with a mock token or header has access.
  // Wait, if anon client returns 0, then we know RLS is enabled and active.
}

run();
