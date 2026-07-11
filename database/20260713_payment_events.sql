-- Phase 2.2: Razorpay Integration - Payment Events and Atomic Processing

-- 1. Create payment_events table
CREATE TABLE IF NOT EXISTS public.payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    razorpay_event_id TEXT UNIQUE NOT NULL,
    business_event business_event_type NOT NULL, -- e.g. BOOKING_PAID mapped from Razorpay order.paid
    booking_id UUID REFERENCES public.bookings(id),
    payment_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
-- No policies granted to public; only Service Role can access.

-- 2. Atomic RPC to process webhooks
CREATE OR REPLACE FUNCTION process_payment_webhook(
    p_razorpay_event_id TEXT,
    p_business_event business_event_type,
    p_booking_id UUID,
    p_payment_id TEXT,
    p_amount DECIMAL(12,2),
    p_payload JSONB
) RETURNS TEXT AS $$
DECLARE
    v_locked BOOLEAN;
    v_transaction_id UUID;
    v_journal_id UUID;
    v_lines JSONB;
BEGIN
    -- Step 1: Acquire advisory lock using a hash of the razorpay_event_id
    -- This prevents concurrent webhook deliveries from processing the same event.
    v_locked := pg_try_advisory_xact_lock(hashtext(p_razorpay_event_id));
    IF NOT v_locked THEN
        -- If we can't get the lock, someone else is processing it right now.
        -- We return ALREADY_PROCESSED so the webhook doesn't retry endlessly, 
        -- or we could raise an exception to force a retry if we preferred.
        -- Per architect's advice, treat duplicate as no-op.
        RETURN 'ALREADY_PROCESSED';
    END IF;

    -- Step 2: Idempotency Check
    IF EXISTS (SELECT 1 FROM public.payment_events WHERE razorpay_event_id = p_razorpay_event_id) THEN
        RETURN 'ALREADY_PROCESSED';
    END IF;

    -- Step 3: Insert raw event
    INSERT INTO public.payment_events (
        razorpay_event_id, business_event, booking_id, payment_id, payload
    ) VALUES (
        p_razorpay_event_id, p_business_event, p_booking_id, p_payment_id, p_payload
    );

    -- Step 4: Ensure Financial Transaction exists or create it
    SELECT id INTO v_transaction_id FROM public.financial_transactions WHERE provider_reference = p_payment_id;
    IF v_transaction_id IS NULL THEN
        INSERT INTO public.financial_transactions (
            transaction_type, status, provider, provider_reference, amount, currency, booking_id, payment_id
        ) VALUES (
            'PAYMENT', 'COMPLETED', 'RAZORPAY', p_payment_id, p_amount, 'INR', p_booking_id, p_payment_id
        ) RETURNING id INTO v_transaction_id;
    ELSE
        UPDATE public.financial_transactions SET status = 'COMPLETED' WHERE id = v_transaction_id;
    END IF;

    -- Step 5: Map Business Event to Ledger Lines and Post Journal
    IF p_business_event = 'BOOKING_PAID' THEN
        -- debit razorpay clearing, credit customer escrow
        v_lines := jsonb_build_array(
            jsonb_build_object('account_code', 1120, 'debit', p_amount, 'credit', 0),
            jsonb_build_object('account_code', 2110, 'debit', 0, 'credit', p_amount)
        );
    ELSIF p_business_event = 'BOOKING_COMPLETED' THEN
        -- We don't usually receive this from Razorpay, but for completeness
        -- Example: debit escrow, credit payables & commission
        v_lines := jsonb_build_array(
            jsonb_build_object('account_code', 2110, 'debit', p_amount, 'credit', 0),
            jsonb_build_object('account_code', 2120, 'debit', 0, 'credit', p_amount * 0.90),
            jsonb_build_object('account_code', 3110, 'debit', 0, 'credit', p_amount * 0.10)
        );
    ELSE
        RAISE EXCEPTION 'Unsupported business event for webhook processing: %', p_business_event;
    END IF;

    -- Post the journal
    v_journal_id := public.post_journal(
        p_business_event,
        v_transaction_id,
        'WHK-' || p_razorpay_event_id,
        v_lines
    );

    -- Step 6: Update Booking Status
    -- We assume 'BOOKING_PAID' means the booking is now CONFIRMED.
    IF p_business_event = 'BOOKING_PAID' AND p_booking_id IS NOT NULL THEN
        UPDATE public.bookings SET status = 'CONFIRMED' WHERE id = p_booking_id;
    END IF;

    -- Step 7: Write Audit Log (if audit_logs table exists, else just skip or write to a generic logs table)
    -- Assuming we have an audit_logs table or we can just use webhook_logs.
    -- For now, we will insert into webhook_logs as an audit trail.
    INSERT INTO public.webhook_logs (
        event_id, provider, event_type, payload
    ) VALUES (
        p_razorpay_event_id, 'SYSTEM_RAZORPAY', p_business_event::text, 
        jsonb_build_object(
            'action', 'POSTED_JOURNAL', 
            'journal_id', v_journal_id, 
            'booking_id', p_booking_id, 
            'payment_id', p_payment_id
        )
    );

    RETURN 'SUCCESS';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
