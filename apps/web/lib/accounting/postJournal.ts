import { SupabaseClient } from '@supabase/supabase-js'
import { JournalRequest, PostJournalResult } from './types'

/**
 * The sacred postJournal contract.
 * Application logic should NEVER insert ledger rows directly.
 * It must use this service, which calls the `post_journal` RPC
 * to ensure atomicity, append-only constraints, and journal balancing.
 */
export async function postJournal(
  supabase: SupabaseClient,
  request: JournalRequest
): Promise<PostJournalResult> {
  try {
    // Basic validation
    if (request.lines.length < 2) {
      return { success: false, error: 'A journal must have at least 2 lines to balance.' }
    }

    const totalDebit = request.lines.reduce((sum, line) => sum + (line.debit || 0), 0)
    const totalCredit = request.lines.reduce((sum, line) => sum + (line.credit || 0), 0)

    // Use a small epsilon for floating point comparison if using decimals in JS,
    // but typically we should compare strictly if doing integer math (e.g. paise).
    // For now, strict equality on the numbers:
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      return {
        success: false,
        error: `Journal does not balance. Debit: ${totalDebit}, Credit: ${totalCredit}`,
      }
    }

    // Map lines to JSONB format expected by the RPC
    const linesJson = request.lines.map((line) => ({
      account_code: line.account,
      debit: line.debit,
      credit: line.credit,
      currency: line.currency || 'INR',
    }))

    // Call the RPC
    const { data, error } = await supabase.rpc('post_journal', {
      p_business_event: request.event,
      p_transaction_id: request.transactionId,
      p_idempotency_key: request.idempotencyKey,
      p_lines: linesJson,
    })

    if (error) {
      console.error('Error calling post_journal RPC:', error)
      return {
        success: false,
        error: error.message || 'Database error occurred while posting journal.',
      }
    }

    return {
      success: true,
      journalId: data,
    }
  } catch (err: any) {
    console.error('Unexpected error in postJournal:', err)
    return { success: false, error: err.message || 'Internal server error' }
  }
}
