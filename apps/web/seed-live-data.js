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

const testAccounts = [
  { email: 'player_arjun@truf.com', name: 'Arjun Sen', role: 'CUSTOMER' },
  { email: 'player_karan@truf.com', name: 'Karan Singh', role: 'CUSTOMER' },
  { email: 'owner_rajesh@truf.com', name: 'Rajesh Kumar', role: 'OWNER' },
  { email: 'owner_vikas@truf.com', name: 'Vikas Reddy', role: 'OWNER' },
]

async function seed() {
  console.log("Seeding test users into auth...")
  for (const account of testAccounts) {
    const { data, error } = await supabase.auth.signUp({
      email: account.email,
      password: 'password123',
      options: {
        data: {
          role: account.role,
          full_name: account.name
        }
      }
    })
    if (error) {
      console.log(`User ${account.email} already exists or failed:`, error.message)
    } else {
      console.log(`Created user: ${account.email} (${data.user?.id})`)
    }
  }
}

seed()
