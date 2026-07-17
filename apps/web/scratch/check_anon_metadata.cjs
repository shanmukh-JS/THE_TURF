const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(url, anonKey);

async function run() {
  const { data: venues, error: vErr } = await supabase.from('venues').select('id');
  const { data: slots, error: sErr } = await supabase.from('slots').select('id');
  
  console.log("Anon Client found venues count:", venues ? venues.length : 0, "Error:", vErr);
  console.log("Anon Client found slots count:", slots ? slots.length : 0, "Error:", sErr);
}

run();
