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
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: venues } = await supabase.from('venues').select('id, name, verification_status')
  console.log("Venues from DB:", venues)
  
  const { data: bookings } = await supabase.from('bookings').select('id, status')
  console.log("Bookings from DB:", bookings)
}

run()
