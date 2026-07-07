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
  // Try to sign up a test owner
  const email = `owner_${Date.now()}@test.com`
  console.log("Signing up test owner:", email)
  const { data, error } = await supabase.auth.signUp({
    email,
    password: 'password123',
    options: {
      data: {
        role: 'OWNER',
        full_name: 'Test Owner Name'
      }
    }
  })

  if (error) {
    console.error("Signup error:", error)
  } else {
    console.log("Signup success:", data.user?.id)
    
    // Wait 2 seconds for trigger
    await new Promise(r => setTimeout(r, 2000))
    
    // Query public.users
    const { data: dbUser } = await supabase.from('users').select('*').eq('id', data.user?.id).single()
    console.log("Inserted public.users:", dbUser)
    
    const { data: dbProfile } = await supabase.from('owner_profiles').select('*').eq('user_id', data.user?.id).single()
    console.log("Inserted owner_profiles:", dbProfile)
  }
}

run()
