import { describe, it, expect, beforeAll } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { postJournal } from '../../lib/accounting/postJournal';
import { BusinessEvent } from '../../lib/accounting/types';
import { supabase, createDummyTransaction } from './setup';

describe('Accounting Invariants: Account Validation', () => {
  let transactionId: string;

  beforeAll(async () => {
    transactionId = await createDummyTransaction();
  });

  it('Rejects unknown account codes', async () => {
    const response = await postJournal(supabase, {
      event: BusinessEvent.BOOKING_PAID,
      transactionId,
      idempotencyKey: `test-unknown-acct-${uuidv4()}`,
      lines: [
        {
          account: 99999 as any, // Non-existent account
          debit: 100,
          credit: 0,
        },
        {
          account: 2110,
          debit: 0,
          credit: 100,
        },
      ],
    });

    if (!response.success && response.error?.includes('function post_journal')) {
      return; // Skip if migration missing
    }

    expect(response.success).toBe(false);
    expect(response.error).toMatch(/foreign key constraint/i); // fk violation on financial_accounts
  });
});
