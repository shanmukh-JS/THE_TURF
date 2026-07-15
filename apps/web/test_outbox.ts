import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function checkOutbox() {
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await adminClient.from('outbox_events').select('*')

  console.log('Outbox error:', error)
  console.log('Outbox items:', data)

  const { data: notifEvents } = await adminClient.from('notification_events').select('*')

  console.log('Notification events:', notifEvents)
}

checkOutbox()
