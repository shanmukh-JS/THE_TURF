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
  console.log("Signing in as admin@turfgaming.com...")
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@turfgaming.com',
    password: 'password123' // fallback / common password
  })

  if (authErr) {
    console.error("Sign in failed:", authErr.message)
    return
  }

  console.log("Sign in successful. User ID:", authData.user?.id)

  const { data: uInfo, error: uErr } = await supabase.from('users').select('*')
  console.log("Users list from authenticated admin:", { count: uInfo?.length, error: uErr })

  const { data: vInfo, error: vErr } = await supabase.from('venues').select('*')
  console.log("Venues list from authenticated admin:", { count: vInfo?.length, error: vErr })
}

run()
