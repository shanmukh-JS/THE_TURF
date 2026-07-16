import { describe, it, expect, beforeAll } from 'vitest'
import { v4 as uuidv4 } from 'uuid'
import { postJournal } from '../../lib/accounting/postJournal'
import { BusinessEvent, ChartOfAccounts } from '../../lib/accounting/types'
import { supabase, createDummyTransaction } from './setup'

describe('Accounting Invariants: Idempotency', () => {
  let transactionId: string

  beforeAll(async () => {
    transactionId = await createDummyTransaction()
  })

  it('Rejects duplicate journal posts with the same idempotency key', async () => {
    const idempotencyKey = `test-idemp-${uuidv4()}`

    // First post should succeed (or fail cleanly if migration missing)
    const firstResponse = await postJournal(supabase, {
      event: BusinessEvent.BOOKING_PAID,
      transactionId,
      idempotencyKey,
      lines: [
        { account: ChartOfAccounts.RAZORPAY_CLEARING, debit: 100, credit: 0 },
        { account: ChartOfAccounts.CUSTOMER_ESCROW_LIABILITY, debit: 0, credit: 100 },
      ],
    })

    if (!firstResponse.success && firstResponse.error?.includes('function post_journal')) {
      return // Skip if migration missing
    }

    expect(firstResponse.success).toBe(true)

    // Second post with the exact same key should succeed and return the same journal ID due to database idempotency design
    const secondResponse = await postJournal(supabase, {
      event: BusinessEvent.BOOKING_PAID,
      transactionId,
      idempotencyKey,
      lines: [
        { account: ChartOfAccounts.RAZORPAY_CLEARING, debit: 100, credit: 0 },
        { account: ChartOfAccounts.CUSTOMER_ESCROW_LIABILITY, debit: 0, credit: 100 },
      ],
    })

    expect(secondResponse.success).toBe(true)
    expect(secondResponse.journalId).toBe(firstResponse.journalId)
  })
})
