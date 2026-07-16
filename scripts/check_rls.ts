import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '..', 'apps', 'web', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Credentials missing, URL:', supabaseUrl, 'key exists:', !!serviceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function main() {
  // Query pg_policies to see what is on financial_ledger
  try {
    const { data: policies, error: polError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'financial_ledger')
    console.log('Policies for financial_ledger:', policies, polError)
  } catch (err) {
    console.error('Error querying pg_policies:', err)
  }

  // Check RLS status of financial_ledger table
  try {
    const { data: rlsStatus, error: rlsError } = await supabase
      .from('pg_tables')
      .select('rowsecurity')
      .eq('tablename', 'financial_ledger')
      .maybeSingle()
    console.log('RLS Status for financial_ledger:', rlsStatus, rlsError)
  } catch (err) {
    console.error('Error querying pg_tables:', err)
  }
}

main()
