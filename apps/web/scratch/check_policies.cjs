const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.rpc('execute_sql_query', {
    sql_text: "SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('bookings', 'slots', 'venues')"
  });
  
  if (error) {
    // If rpc execute_sql_query doesn't exist, we can run raw query via prisma or read migrations
    console.log("RPC Error:", error);
    // Let's check policies by reading pg_catalog via direct SELECT if possible, but execute_sql_query is custom
  } else {
    console.log("Policies:", data);
  }
}

run();
