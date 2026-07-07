import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

let supabaseUrl = ''
let supabaseKey = ''

try {
  const envContent = fs.readFileSync('.env.local', 'utf8')
  const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.+)/)
  const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY\s*=\s*(.+)/)
  if (urlMatch) supabaseUrl = urlMatch[1].trim().replace(/['"]/g, '')
  if (keyMatch) supabaseKey = keyMatch[1].trim().replace(/['"]/g, '')
} catch (e) {
  console.log("Could not read .env.local, falling back to process.env")
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
}

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env vars")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  console.log("Supabase URL:", supabaseUrl)
  
  // Query users
  const { data: users, error: usersErr } = await supabase.from('users').select('*')
  console.log("Users Query result:", { count: users?.length, error: usersErr })
  if (users) {
    console.log("Sample Users:", users.slice(0, 3))
  }

  // Query venues
  const { data: venues, error: venuesErr } = await supabase.from('venues').select('*')
  console.log("Venues Query result:", { count: venues?.length, error: venuesErr })

  // Query bookings
  const { data: bookings, error: bookingsErr } = await supabase.from('bookings').select('*')
  console.log("Bookings Query result:", { count: bookings?.length, error: bookingsErr })
}

test()
