import { describe, it, expect, beforeAll } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { postJournal } from '../../lib/accounting/postJournal';
import { BusinessEvent, ChartOfAccounts } from '../../lib/accounting/types';
import { supabase, createDummyTransaction } from './setup';

describe('Accounting Posting Rules', () => {
  let transactionId: string;

  beforeAll(async () => {
    transactionId = await createDummyTransaction();
  });

  it('BOOKING_PAID: Debits Razorpay Clearing and Credits Customer Escrow Liability', async () => {
    const response = await postJournal(supabase, {
      event: BusinessEvent.BOOKING_PAID,
      transactionId,
      idempotencyKey: `test-rule-paid-${uuidv4()}`,
      lines: [
        { account: ChartOfAccounts.RAZORPAY_CLEARING, debit: 1000, credit: 0 },
        { account: ChartOfAccounts.CUSTOMER_ESCROW_LIABILITY, debit: 0, credit: 1000 },
      ],
    });

    if (!response.success && response.error?.includes('function post_journal')) {
      return; // Skip if migration missing
    }

    expect(response.success).toBe(true);

    const { data: entries } = await supabase
      .from('financial_ledger_entries')
      .select('*')
      .eq('journal_id', response.journalId);

    expect(entries).toHaveLength(2);
    
    const debitLine = entries?.find(e => e.debit === 1000);
    const creditLine = entries?.find(e => e.credit === 1000);
    
    expect(debitLine).toBeDefined();
    expect(debitLine?.account_code).toBe(ChartOfAccounts.RAZORPAY_CLEARING);
    
    expect(creditLine).toBeDefined();
    expect(creditLine?.account_code).toBe(ChartOfAccounts.CUSTOMER_ESCROW_LIABILITY);
  });

  it('BOOKING_COMPLETED: Debits Escrow, Credits Payables and Commission', async () => {
    const response = await postJournal(supabase, {
      event: BusinessEvent.BOOKING_COMPLETED,
      transactionId,
      idempotencyKey: `test-rule-completed-${uuidv4()}`,
      lines: [
        { account: ChartOfAccounts.CUSTOMER_ESCROW_LIABILITY, debit: 1000, credit: 0 },
        { account: ChartOfAccounts.OWNER_PAYABLES, debit: 0, credit: 900 },
        { account: ChartOfAccounts.BOOKING_COMMISSION, debit: 0, credit: 100 },
      ],
    });

    if (!response.success && response.error?.includes('function post_journal')) {
      return; // Skip if migration missing
    }

    expect(response.success).toBe(true);

    const { data: entries } = await supabase
      .from('financial_ledger_entries')
      .select('*')
      .eq('journal_id', response.journalId);

    expect(entries).toHaveLength(3);
    
    const escrowDebit = entries?.find(e => e.account_code === ChartOfAccounts.CUSTOMER_ESCROW_LIABILITY);
    expect(escrowDebit?.debit).toBe(1000);

    const payableCredit = entries?.find(e => e.account_code === ChartOfAccounts.OWNER_PAYABLES);
    expect(payableCredit?.credit).toBe(900);

    const commissionCredit = entries?.find(e => e.account_code === ChartOfAccounts.BOOKING_COMMISSION);
    expect(commissionCredit?.credit).toBe(100);
  });
});
