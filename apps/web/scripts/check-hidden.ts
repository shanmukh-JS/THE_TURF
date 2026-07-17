import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function run() {
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, hidden_from_player, customer_id')

  console.log(
    bookings?.filter((b) => b.hidden_from_player).length,
    'hidden out of',
    bookings?.length
  )
}
run()
