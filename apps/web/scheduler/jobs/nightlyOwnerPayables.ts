import { ownerPayableQueue } from '../../workers/queues'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function enqueueNightlyOwnerPayables(): Promise<number> {
  // 1. Identify all eligible owners who have settled bookings that haven't been made into payables.
  // In a real app, this would be an RPC call or a query to find distinct owner_ids.
  // For simulation, we'll enqueue a wildcard job that the worker handles, or specific owner jobs.

  // Example: The worker could handle a single job that loops over all owners, or we enqueue per owner.
  // The user specifies: "Find eligible completed bookings -> Queue owner-payable jobs -> OwnerPayableWorker -> Supabase RPC -> Ledger"

  // We'll queue a master job or query owners and queue for each. Let's queue a generic batch trigger.
  const job = await ownerPayableQueue.add('generate-nightly-payables', {
    triggerTime: new Date().toISOString(),
  })

  return 1 // Enqueued 1 master job
}
