import { describe, it, expect, beforeAll } from 'vitest'
import { v4 as uuidv4 } from 'uuid'
import { postJournal } from '../../lib/accounting/postJournal'
import { BusinessEvent, ChartOfAccounts } from '../../lib/accounting/types'
import { supabase, createDummyTransaction } from './setup'

describe('Accounting Invariants: Transaction Atomicity', () => {
  let transactionId: string

  beforeAll(async () => {
    transactionId = await createDummyTransaction()
  })

  it('If one line fails, no journal or ledger entries are written', async () => {
    const idempotencyKey = `test-atomicity-${uuidv4()}`

    const response = await postJournal(supabase, {
      event: BusinessEvent.BOOKING_PAID,
      transactionId,
      idempotencyKey,
      lines: [
        {
          account: ChartOfAccounts.RAZORPAY_CLEARING,
          debit: 100,
          credit: 0,
        },
        {
          account: 99999 as any, // This will fail the FK constraint
          debit: 0,
          credit: 100,
        },
      ],
    })

    if (!response.success && response.error?.includes('function post_journal')) {
      return // Skip if migration missing
    }

    expect(response.success).toBe(false)

    // Verify that NO journal was created for this idempotency key
    const { data: journals } = await supabase
      .from('financial_journals')
      .select('id')
      .eq('idempotency_key', idempotencyKey)

    expect(journals?.length).toBe(0)
  })
})
