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

async function test() {
  // Query all owner profiles
  const { data: profiles, error: pErr } = await supabase.from('owner_profiles').select('*')
  console.log("All Owner Profiles:", profiles, pErr)

  if (profiles && profiles.length > 0) {
    for (const p of profiles) {
      const { data: user, error: uErr } = await supabase.from('users').select('*').eq('id', p.user_id).single()
      console.log(`Associated user for ${p.full_name} (${p.user_id}):`, user, uErr)
    }
  }
}

test()
