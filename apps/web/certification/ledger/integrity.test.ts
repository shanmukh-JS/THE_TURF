import { describe, it, expect } from 'vitest'
import { supabase } from '../fixtures/setup'

describe('Pillar 1 - Ledger Integrity', () => {
  it('should have balanced journals (SUM of debits == SUM of credits)', async () => {
    // Query all ledger entries
    const { data: entries, error } = await supabase
      .from('financial_ledger_entries')
      .select('journal_id, debit, credit')

    expect(error).toBeNull()

    if (!entries || entries.length === 0) {
      // If no entries exist, it's balanced by default
      return
    }

    // Accumulate debit and credit sums per journal
    const sums: Record<string, { debit: number; credit: number }> = {}
    for (const entry of entries) {
      const journalId = entry.journal_id
      if (journalId) {
        if (!sums[journalId]) {
          sums[journalId] = { debit: 0, credit: 0 }
        }
        sums[journalId].debit += Number(entry.debit || 0)
        sums[journalId].credit += Number(entry.credit || 0)
      }
    }

    // Verify each journal's double-entry balances
    for (const [journalId, sum] of Object.entries(sums)) {
      expect(sum.debit).toBeCloseTo(sum.credit, 2)
    }
  })

  it('should not contain any orphan ledger entries', async () => {
    // Assert all ledger entries link to a valid journal
    const { data: entries, error: entryErr } = await supabase
      .from('financial_ledger_entries')
      .select('journal_id')

    expect(entryErr).toBeNull()

    if (!entries || entries.length === 0) {
      return
    }

    // Get all valid journals
    const { data: journals, error: journalErr } = await supabase
      .from('financial_journals')
      .select('id')

    expect(journalErr).toBeNull()

    const validJournalIds = new Set(journals?.map((j) => j.id) || [])

    for (const entry of entries) {
      expect(validJournalIds.has(entry.journal_id)).toBe(true)
    }
  })

  it('should prevent ledger records from being updated or deleted', async () => {
    // Assert that the trigger strictly blocks DELETE and UPDATE on financial_ledger_entries
    const { data: entries } = await supabase.from('financial_ledger_entries').select('id').limit(1)

    if (!entries || entries.length === 0) {
      // Skip write assertion if ledger is empty
      return
    }

    const targetId = entries?.[0]?.id
    if (!targetId) return

    // Attempt update
    const { error: updateError } = await supabase
      .from('financial_ledger_entries')
      .update({ debit: 999.99 })
      .eq('id', targetId)

    expect(updateError).not.toBeNull()
    expect(updateError?.message).toContain('Immutable record')

    // Attempt delete
    const { error: deleteError } = await supabase
      .from('financial_ledger_entries')
      .delete()
      .eq('id', targetId)

    expect(deleteError).not.toBeNull()
    expect(deleteError?.message).toContain('Immutable record')
  })
})
