-- Phase 2.1: Financial Constitution & Immutable Ledger
-- This migration establishes the strict double-entry accounting core for TRUF Gaming.

-- 1. Enums
CREATE TYPE business_event_type AS ENUM (
    'BOOKING_PAID', 'BOOKING_COMPLETED', 'BOOKING_CANCELLED', 
    'REFUND_INITIATED', 'REFUND_APPROVED', 'REFUND_COMPLETED', 
    'SETTLEMENT_CREATED', 'SETTLEMENT_COMPLETED', 'PAYOUT_FAILED'
);

-- 2. Tables

CREATE TABLE financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_type TEXT NOT NULL,
    status TEXT NOT NULL,
    provider TEXT, -- 'RAZORPAY', 'INTERNAL', etc.
    provider_reference TEXT,
    amount DECIMAL(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    booking_id UUID REFERENCES bookings(id),
    payment_id TEXT,
    refund_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE financial_accounts (
    code INT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('ASSET', 'LIABILITY', 'REVENUE', 'EXPENSE', 'EQUITY')),
    normal_balance TEXT NOT NULL CHECK (normal_balance IN ('DEBIT', 'CREDIT'))
);

CREATE TABLE financial_journals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_number TEXT UNIQUE NOT NULL, -- e.g. JRN-2026-000001
    business_event business_event_type NOT NULL,
    transaction_id UUID NOT NULL REFERENCES financial_transactions(id),
    idempotency_key TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE financial_ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_id UUID NOT NULL REFERENCES financial_journals(id) ON DELETE RESTRICT,
    line_number INT NOT NULL,
    account_code INT NOT NULL REFERENCES financial_accounts(code) ON DELETE RESTRICT,
    debit DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    credit DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'INR',
    exchange_rate DECIMAL(10, 6) NOT NULL DEFAULT 1.000000,
    base_currency TEXT NOT NULL DEFAULT 'INR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(journal_id, line_number),
    CHECK (debit >= 0 AND credit >= 0),
    CHECK (debit > 0 OR credit > 0),
    CHECK (NOT (debit > 0 AND credit > 0))
);

CREATE TABLE settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id),
    journal_id UUID NOT NULL REFERENCES financial_journals(id),
    amount DECIMAL(12, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    retry_count INT NOT NULL DEFAULT 0,
    last_error TEXT,
    provider_reference TEXT,
    payout_batch TEXT,
    completed_by UUID REFERENCES users(id),
    scheduled_for TIMESTAMPTZ NOT NULL,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Triggers for Immutability

CREATE OR REPLACE FUNCTION prevent_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Immutable record: Updates and Deletions are strictly prohibited on financial records.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_journal_immutability
BEFORE UPDATE OR DELETE ON financial_journals
FOR EACH ROW EXECUTE FUNCTION prevent_modification();

CREATE TRIGGER enforce_ledger_immutability
BEFORE UPDATE OR DELETE ON financial_ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_modification();

-- Note: In Phase 2.1, we'll keep financial_transactions slightly mutable if we need to update status (e.g. PENDING -> COMPLETED).
-- If we want absolute immutability on transactions too, we'd need a separate transaction_status_history table.
-- Let's leave transactions mutable for status updates, or we can make them immutable and handle status via journals.
-- Given the architect's note "Money is never edited", journals/ledger must be immutable.

-- 4. Triggers for Journal Balancing and Completeness

CREATE OR REPLACE FUNCTION verify_journal_balance()
RETURNS TRIGGER AS $$
DECLARE
    total_debit DECIMAL(12,2);
    total_credit DECIMAL(12,2);
    line_count INT;
BEGIN
    -- This trigger is fired AFTER INSERT on financial_ledger_entries, deferred to end of transaction.
    
    SELECT SUM(debit), SUM(credit), COUNT(*)
    INTO total_debit, total_credit, line_count
    FROM financial_ledger_entries
    WHERE journal_id = NEW.journal_id;

    IF line_count < 2 THEN
        RAISE EXCEPTION 'Journal % must have at least 2 ledger entries (lines).', NEW.journal_id;
    END IF;

    IF total_debit != total_credit THEN
        RAISE EXCEPTION 'Journal % is out of balance. Total Debit: %, Total Credit: %', NEW.journal_id, total_debit, total_credit;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER ensure_journal_balance
AFTER INSERT ON financial_ledger_entries
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION verify_journal_balance();

-- 5. Seed Chart of Accounts

INSERT INTO financial_accounts (code, name, category, normal_balance) VALUES
-- Assets
(1110, 'Operating Bank', 'ASSET', 'DEBIT'),
(1120, 'Razorpay Clearing', 'ASSET', 'DEBIT'),
(1140, 'Petty Cash', 'ASSET', 'DEBIT'),
(1210, 'Customer Receivable', 'ASSET', 'DEBIT'),
(1220, 'Owner Receivable', 'ASSET', 'DEBIT'),

-- Liabilities
(2110, 'Customer Escrow Liability', 'LIABILITY', 'CREDIT'),
(2120, 'Owner Payables', 'LIABILITY', 'CREDIT'),
(2130, 'Refund Pending Liability', 'LIABILITY', 'CREDIT'),
(2140, 'Refund Approved Liability', 'LIABILITY', 'CREDIT'),
(2150, 'Wallet Liability', 'LIABILITY', 'CREDIT'),
(2160, 'Tax Liability', 'LIABILITY', 'CREDIT'),

-- Revenue
(3110, 'Booking Commission', 'REVENUE', 'CREDIT'),
(3120, 'Convenience Fee', 'REVENUE', 'CREDIT'),
(3130, 'Subscription Revenue', 'REVENUE', 'CREDIT'),

-- Expenses
(4110, 'Payment Gateway Fees', 'EXPENSE', 'DEBIT'),
(4120, 'Promotional Credits', 'EXPENSE', 'DEBIT'),

-- Equity
(5110, 'Retained Earnings', 'EQUITY', 'CREDIT');

-- 6. RPC for Posting Journals Safely
-- This function acts as the strictly typed contract for the application to insert journals.

CREATE OR REPLACE FUNCTION post_journal(
    p_business_event business_event_type,
    p_transaction_id UUID,
    p_idempotency_key TEXT,
    p_lines JSONB
) RETURNS UUID AS $$
DECLARE
    v_journal_id UUID;
    v_journal_number TEXT;
    v_line JSONB;
    v_line_number INT := 1;
BEGIN
    -- 1. Generate Journal Number (e.g. JRN-2026-XXXX)
    v_journal_number := 'JRN-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(CAST(nextval('financial_journals_seq'::regclass) AS TEXT), 6, '0');

    -- 2. Create Journal
    INSERT INTO financial_journals (
        journal_number, business_event, transaction_id, idempotency_key
    ) VALUES (
        v_journal_number, p_business_event, p_transaction_id, p_idempotency_key
    ) RETURNING id INTO v_journal_id;

    -- 3. Create Ledger Entries from JSON array
    FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
    LOOP
        INSERT INTO financial_ledger_entries (
            journal_id, line_number, account_code, debit, credit, currency
        ) VALUES (
            v_journal_id, 
            v_line_number, 
            (v_line->>'account_code')::INT, 
            COALESCE((v_line->>'debit')::DECIMAL, 0), 
            COALESCE((v_line->>'credit')::DECIMAL, 0), 
            COALESCE(v_line->>'currency', 'INR')
        );
        v_line_number := v_line_number + 1;
    END LOOP;

    -- The trigger 'ensure_journal_balance' will fire at the end of the transaction to verify constraints.
    
    RETURN v_journal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create sequence for journal numbers
CREATE SEQUENCE IF NOT EXISTS financial_journals_seq START 1;

-- 7. RLS (Row Level Security)

ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- Deny all by default to public. Only Service Role (backend) can modify these.
