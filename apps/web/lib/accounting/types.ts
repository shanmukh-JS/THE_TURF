export enum BusinessEvent {
  BOOKING_PAID = 'BOOKING_PAID',
  BOOKING_COMPLETED = 'BOOKING_COMPLETED',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
  REFUND_INITIATED = 'REFUND_INITIATED',
  REFUND_APPROVED = 'REFUND_APPROVED',
  REFUND_COMPLETED = 'REFUND_COMPLETED',
  SETTLEMENT_CREATED = 'SETTLEMENT_CREATED',
  SETTLEMENT_COMPLETED = 'SETTLEMENT_COMPLETED',
  PAYOUT_FAILED = 'PAYOUT_FAILED',
}

export enum ChartOfAccounts {
  // Assets
  OPERATING_BANK = 1110,
  RAZORPAY_CLEARING = 1120,
  PETTY_CASH = 1140,
  CUSTOMER_RECEIVABLE = 1210,
  OWNER_RECEIVABLE = 1220,

  // Liabilities
  CUSTOMER_ESCROW_LIABILITY = 2110,
  OWNER_PAYABLES = 2120,
  REFUND_PENDING_LIABILITY = 2130,
  REFUND_APPROVED_LIABILITY = 2140,
  WALLET_LIABILITY = 2150,
  TAX_LIABILITY = 2160,

  // Revenue
  BOOKING_COMMISSION = 3110,
  CONVENIENCE_FEE = 3120,
  SUBSCRIPTION_REVENUE = 3130,

  // Expenses
  PAYMENT_GATEWAY_FEES = 4110,
  PROMOTIONAL_CREDITS = 4120,

  // Equity
  RETAINED_EARNINGS = 5110,
}

export interface LedgerLine {
  account: ChartOfAccounts;
  debit: number;
  credit: number;
  currency?: string;
  exchangeRate?: number;
  baseCurrency?: string;
}

export interface JournalRequest {
  event: BusinessEvent;
  transactionId: string; // UUID referencing financial_transactions
  idempotencyKey: string;
  lines: LedgerLine[];
}

export interface PostJournalResult {
  success: boolean;
  journalId?: string;
  error?: string;
}
