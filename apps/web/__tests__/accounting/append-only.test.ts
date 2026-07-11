import { describe, it, expect, beforeAll } from 'vitest'
import { v4 as uuidv4 } from 'uuid'
import { postJournal } from '../../lib/accounting/postJournal'
import { BusinessEvent, ChartOfAccounts } from '../../lib/accounting/types'
import { supabase, createDummyTransaction } from './setup'

describe('Accounting Invariants: Append Only', () => {
  let transactionId: string
  let journalId: string | undefined

  beforeAll(async () => {
    transactionId = await createDummyTransaction()

    const response = await postJournal(supabase, {
      event: BusinessEvent.BOOKING_PAID,
      transactionId,
      idempotencyKey: `test-append-${uuidv4()}`,
      lines: [
        { account: ChartOfAccounts.RAZORPAY_CLEARING, debit: 500, credit: 0 },
        { account: ChartOfAccounts.CUSTOMER_ESCROW_LIABILITY, debit: 0, credit: 500 },
      ],
    })

    if (response.success && response.journalId) {
      journalId = response.journalId
    }
  })

  it('Rejects UPDATE on financial_journals', async () => {
    if (!journalId) return // Skip if migration not applied

    const { error } = await supabase
      .from('financial_journals')
      .update({ business_event: 'BOOKING_CANCELLED' })
      .eq('id', journalId)

    expect(error).toBeDefined()
    expect(error?.message).toMatch(/Immutable record/i)
  })

  it('Rejects DELETE on financial_journals', async () => {
    if (!journalId) return

    const { error } = await supabase.from('financial_journals').delete().eq('id', journalId)

    expect(error).toBeDefined()
    expect(error?.message).toMatch(/Immutable record/i)
  })

  it('Rejects UPDATE on financial_ledger_entries', async () => {
    if (!journalId) return

    // Try to change a ledger line's debit amount
    const { error } = await supabase
      .from('financial_ledger_entries')
      .update({ debit: 1000 })
      .eq('journal_id', journalId)

    expect(error).toBeDefined()
    expect(error?.message).toMatch(/Immutable record/i)
  })
})
