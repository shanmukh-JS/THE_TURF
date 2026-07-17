-- SQL Migration: FinTech-grade automatic booking cancellation and refund system schema
-- Sets up enums, slot_reservations, refunds, refund_events, and updates bookings table constraints.

BEGIN;

-- 1. Create Enums / Types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'refund_status_type') THEN
        CREATE TYPE refund_status_type AS ENUM ('REQUESTED', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRYING', 'CANCELLED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'slot_reservation_status_type') THEN
        CREATE TYPE slot_reservation_status_type AS ENUM ('ACTIVE', 'RELEASED', 'EXPIRED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_event_type') THEN
        CREATE TYPE booking_event_type AS ENUM ('BOOKING_CREATED', 'PAYMENT_CAPTURED', 'CONFIRMED', 'CANCEL_REQUESTED', 'CANCELLED', 'REFUND_REQUESTED', 'REFUND_COMPLETED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'refund_event_type') THEN
        CREATE TYPE refund_event_type AS ENUM ('REQUESTED', 'QUEUED', 'WORKER_STARTED', 'RAZORPAY_REQUEST', 'RAZORPAY_SUCCESS', 'WEBHOOK_RECEIVED', 'COMPLETED', 'FAILED');
    END IF;
END
$$;

-- 2. Update Bookings Table Constraints & Add Columns
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancelled_by TEXT CHECK (cancelled_by IN ('PLAYER', 'OWNER', 'ADMIN'));
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_version INT DEFAULT 1 NOT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS policy_version TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS policy_snapshot JSONB;

-- Add check constraint for booking status
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS chk_booking_status;
ALTER TABLE public.bookings ADD CONSTRAINT chk_booking_status CHECK (status IN ('PENDING_PAYMENT', 'CONFIRMED', 'CANCEL_REQUESTED', 'CANCELLED', 'IN_PROGRESS', 'COMPLETED'));

-- 3. Update Admin Settings
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS cancellation_policy JSONB DEFAULT '[
  {"hours": 24, "refund_percent": 100},
  {"hours": 12, "refund_percent": 75},
  {"hours": 6, "refund_percent": 50}
]'::jsonb;
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS refund_expiration_days INT DEFAULT 60;

-- 4. Create slot_reservations Table (Inventory logs)
CREATE TABLE IF NOT EXISTS public.slot_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_id UUID REFERENCES public.slots(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    status slot_reservation_status_type NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Create refunds Table (Supports 1-to-many relationship)
CREATE TABLE IF NOT EXISTS public.refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE RESTRICT,
    payment_id TEXT NOT NULL,
    refund_id TEXT UNIQUE, -- Razorpay refund ID
    amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    status refund_status_type NOT NULL DEFAULT 'REQUESTED',
    cancellation_reason TEXT,
    cancelled_by TEXT NOT NULL CHECK (cancelled_by IN ('PLAYER', 'OWNER', 'ADMIN')),
    idempotency_key TEXT UNIQUE NOT NULL,
    correlation_id UUID NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- 6. Create refund_events Table (Audit trail)
CREATE TABLE IF NOT EXISTS public.refund_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    refund_id UUID REFERENCES public.refunds(id) ON DELETE CASCADE,
    event_type refund_event_type NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Create booking_events Table (Audit trail)
CREATE TABLE IF NOT EXISTS public.booking_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    event_type booking_event_type NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    correlation_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Enable Row Level Security (RLS)
ALTER TABLE public.slot_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;

-- 9. Add RLS Policies
-- Slot Reservations Policies
DROP POLICY IF EXISTS "Admins full access to slot reservations" ON public.slot_reservations;
CREATE POLICY "Admins full access to slot reservations" ON public.slot_reservations
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
    );

DROP POLICY IF EXISTS "Users can read own slot reservations" ON public.slot_reservations;
CREATE POLICY "Users can read own slot reservations" ON public.slot_reservations
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.bookings 
            WHERE bookings.id = slot_reservations.booking_id AND bookings.customer_id = auth.uid()
        )
    );

-- Refunds Policies
DROP POLICY IF EXISTS "Admins full access to refunds" ON public.refunds;
CREATE POLICY "Admins full access to refunds" ON public.refunds
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
    );

DROP POLICY IF EXISTS "Customers read own refunds" ON public.refunds;
CREATE POLICY "Customers read own refunds" ON public.refunds
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.bookings 
            WHERE bookings.id = refunds.booking_id AND bookings.customer_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Owners read refunds of their venues" ON public.refunds;
CREATE POLICY "Owners read refunds of their venues" ON public.refunds
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.bookings
            JOIN public.venues ON venues.id = bookings.venue_id
            JOIN public.owner_profiles ON owner_profiles.id = venues.owner_id
            WHERE bookings.id = refunds.booking_id AND owner_profiles.user_id = auth.uid()
        )
    );

-- Refund Events Policies
DROP POLICY IF EXISTS "Admins full access to refund events" ON public.refund_events;
CREATE POLICY "Admins full access to refund events" ON public.refund_events
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
    );

DROP POLICY IF EXISTS "Customers read own refund events" ON public.refund_events;
CREATE POLICY "Customers read own refund events" ON public.refund_events
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.refunds
            JOIN public.bookings ON bookings.id = refunds.booking_id
            WHERE refunds.id = refund_events.refund_id AND bookings.customer_id = auth.uid()
        )
    );

-- Booking Events Policies
DROP POLICY IF EXISTS "Admins full access to booking events" ON public.booking_events;
CREATE POLICY "Admins full access to booking events" ON public.booking_events
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
    );

DROP POLICY IF EXISTS "Customers read own booking events" ON public.booking_events;
CREATE POLICY "Customers read own booking events" ON public.booking_events
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.bookings 
            WHERE bookings.id = booking_events.booking_id AND bookings.customer_id = auth.uid()
        )
    );

-- 10. Atomic PL/pgSQL function to process cancellation & Phase A ledger
CREATE OR REPLACE FUNCTION public.rpc_cancel_booking_v1(
    p_booking_id UUID,
    p_actor_id UUID,
    p_cancellation_reason TEXT,
    p_correlation_id UUID,
    p_expected_version INT
) RETURNS JSONB AS $$
DECLARE
    v_booking RECORD;
    v_slot RECORD;
    v_payable RECORD;
    v_policy JSONB;
    v_refund_expiration_days INT;
    v_hours_remaining NUMERIC;
    v_refund_percent NUMERIC := 0;
    v_refund_amount NUMERIC := 0;
    v_commission_amount NUMERIC := 0;
    v_idempotency_key TEXT;
    v_refund_id UUID;
    v_journal_id UUID;
    v_transaction_id UUID;
    v_policy_rule JSONB;
    v_policy_snapshot JSONB;
    v_result JSONB;
BEGIN
    -- 1. Pessimistic Lock & Fetch Booking
    SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;

    -- Concurrency Check (Optimistic Locking)
    IF v_booking.booking_version != p_expected_version THEN
        RAISE EXCEPTION 'Concurrency mismatch: Booking was modified by another request (expected version %, got %)', p_expected_version, v_booking.booking_version;
    END IF;

    -- State Machine Check
    IF v_booking.status NOT IN ('PENDING_PAYMENT', 'CONFIRMED', 'CANCEL_REQUESTED') THEN
        RAISE EXCEPTION 'Booking in state % cannot be cancelled', v_booking.status;
    END IF;

    -- Verify slot details
    SELECT * INTO v_slot FROM public.slots WHERE id = v_booking.slot_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Associated slot not found';
    END IF;

    -- Check if booking already started
    IF v_slot.start_time <= NOW() THEN
        RAISE EXCEPTION 'Cannot cancel booking that has already started or completed';
    END IF;

    -- 2. Owner Settlement Checks
    SELECT * INTO v_payable FROM public.owner_payables WHERE booking_id = p_booking_id FOR UPDATE;
    IF FOUND THEN
        IF v_payable.status NOT IN ('PENDING', 'FAILED') THEN
            RAISE EXCEPTION 'Refund requires manual approval. Owner payout is already batched, processing, or settled';
        END IF;
        
        -- Void pending payable
        UPDATE public.owner_payables 
        SET status = 'FAILED',
            failed_at = NOW()
        WHERE id = v_payable.id;
    END IF;

    -- 3. Fetch active cancellation policy from admin_settings
    SELECT cancellation_policy, refund_expiration_days 
    INTO v_policy, v_refund_expiration_days
    FROM public.admin_settings 
    LIMIT 1;

    -- Check refund expiration (SLA)
    IF v_booking.created_at + (v_refund_expiration_days || ' days')::INTERVAL < NOW() THEN
        RAISE EXCEPTION 'Cancellation window expired. Refund is not allowed after % days from booking', v_refund_expiration_days;
    END IF;

    -- Calculate hours remaining to slot start
    v_hours_remaining := EXTRACT(EPOCH FROM (v_slot.start_time - NOW())) / 3600.0;

    -- Determine refund percentage from policy JSON
    FOR v_policy_rule IN SELECT * FROM jsonb_array_elements(v_policy) ORDER BY (value->>'hours')::NUMERIC DESC
    LOOP
        IF v_hours_remaining >= (v_policy_rule->>'hours')::NUMERIC THEN
            v_refund_percent := (v_policy_rule->>'refund_percent')::NUMERIC;
            EXIT;
        END IF;
    END LOOP;

    -- Calculate amounts
    v_refund_amount := ROUND((v_booking.advance_paid * (v_refund_percent / 100.0)), 2);
    v_commission_amount := v_booking.advance_paid - v_refund_amount;

    -- 4. Release Inventory (Slot Availability) Immediately
    UPDATE public.slots 
    SET status = 'Available', 
        is_booked = false, 
        is_locked = false, 
        lock_expires = NULL
    WHERE id = v_booking.slot_id;

    INSERT INTO public.slot_reservations (slot_id, booking_id, status)
    VALUES (v_booking.slot_id, p_booking_id, 'RELEASED');

    -- Create policy snapshot
    v_policy_snapshot := jsonb_build_object(
        'timezone', 'Asia/Kolkata',
        'evaluation_timestamp', NOW(),
        'hours_remaining', v_hours_remaining,
        'rules', v_policy,
        'refund_percent_applied', v_refund_percent
    );

    -- 5. Update Booking Status to CANCELLED
    UPDATE public.bookings 
    SET status = 'CANCELLED',
        cancelled_by = 'PLAYER',
        cancelled_at = NOW(),
        cancellation_reason = p_cancellation_reason,
        refund_amount = v_refund_amount,
        refund_status = CASE WHEN v_refund_amount > 0 THEN 'QUEUED'::refund_status_type ELSE 'COMPLETED'::refund_status_type END,
        policy_version = 'v1',
        policy_snapshot = v_policy_snapshot,
        booking_version = v_booking.booking_version + 1
    WHERE id = p_booking_id;

    -- Create booking events
    INSERT INTO public.booking_events (booking_id, event_type, payload, correlation_id)
    VALUES (p_booking_id, 'CANCEL_REQUESTED', jsonb_build_object('actor_id', p_actor_id), p_correlation_id);

    INSERT INTO public.booking_events (booking_id, event_type, payload, correlation_id)
    VALUES (p_booking_id, 'CANCELLED', jsonb_build_object('refund_amount', v_refund_amount), p_correlation_id);

    -- 6. Create Refund Record
    v_idempotency_key := 'ref_' || p_booking_id::text || '_' || EXTRACT(EPOCH FROM NOW())::TEXT;
    v_refund_id := gen_random_uuid();

    INSERT INTO public.refunds (
        id, booking_id, payment_id, amount, status, cancellation_reason, cancelled_by, idempotency_key, correlation_id, expires_at
    ) VALUES (
        v_refund_id,
        p_booking_id,
        v_booking.payment_id,
        v_refund_amount,
        CASE WHEN v_refund_amount > 0 THEN 'QUEUED'::refund_status_type ELSE 'COMPLETED'::refund_status_type END,
        p_cancellation_reason,
        'PLAYER',
        v_idempotency_key,
        p_correlation_id,
        NOW() + (v_refund_expiration_days || ' days')::INTERVAL
    );

    INSERT INTO public.refund_events (refund_id, event_type, metadata)
    VALUES (v_refund_id, 'REQUESTED', jsonb_build_object('amount', v_refund_amount));

    IF v_refund_amount > 0 THEN
        INSERT INTO public.refund_events (refund_id, event_type, metadata)
        VALUES (v_refund_id, 'QUEUED', jsonb_build_object('queue_time', NOW()));
    END IF;

    -- 7. Accounting: Post Phase A Ledger entries (debits 2110, credits 2130 & 3110)
    -- Only post if payment was successful and advance was paid
    IF v_booking.advance_paid > 0 THEN
        SELECT id INTO v_transaction_id FROM public.financial_transactions WHERE provider_reference = v_booking.payment_id LIMIT 1;
        
        -- If no transaction was found, create one first so we don't break the ledger constraints
        IF v_transaction_id IS NULL THEN
            INSERT INTO public.financial_transactions (
                transaction_type, status, provider, provider_reference, amount, currency, booking_id, payment_id
            ) VALUES (
                'PAYMENT', 'COMPLETED', 'RAZORPAY', v_booking.payment_id, v_booking.advance_paid, 'INR', p_booking_id, v_booking.payment_id
            ) RETURNING id INTO v_transaction_id;
        END IF;

        PERFORM public.post_journal(
            'BOOKING_CANCELLED'::business_event_type,
            v_transaction_id,
            v_idempotency_key,
            jsonb_build_array(
                jsonb_build_object('account_code', 2110, 'debit', v_booking.advance_paid, 'credit', 0),
                jsonb_build_object('account_code', 2130, 'debit', 0, 'credit', v_refund_amount),
                jsonb_build_object('account_code', 3110, 'debit', 0, 'credit', v_commission_amount)
            )
        );
    END IF;

    -- 8. Return results
    v_result := jsonb_build_object(
        'success', true,
        'booking_id', p_booking_id,
        'refund_id', v_refund_id,
        'refund_amount', v_refund_amount,
        'refund_percent', v_refund_percent,
        'refund_status', CASE WHEN v_refund_amount > 0 THEN 'QUEUED' ELSE 'COMPLETED' END,
        'idempotency_key', v_idempotency_key,
        'correlation_id', p_correlation_id
    );
    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION '%', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Atomic PL/pgSQL function to complete refund (Phase B ledger)
CREATE OR REPLACE FUNCTION public.rpc_complete_refund_v1(
    p_provider_refund_id TEXT,
    p_correlation_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_refund RECORD;
    v_booking RECORD;
    v_transaction_id UUID;
    v_journal_id UUID;
    v_result JSONB;
BEGIN
    -- 1. Pessimistic Lock Refund Row
    SELECT * INTO v_refund FROM public.refunds WHERE refund_id = p_provider_refund_id FOR UPDATE;
    IF NOT FOUND THEN
        -- Try querying by idempotency key if refund_id is not saved yet
        SELECT * INTO v_refund FROM public.refunds WHERE idempotency_key = p_provider_refund_id FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Refund record not found for provider reference %', p_provider_refund_id;
        END IF;
    END IF;

    -- Idempotency Check
    IF v_refund.status = 'COMPLETED' THEN
        RETURN jsonb_build_object('success', true, 'message', 'ALREADY_PROCESSED');
    END IF;

    -- 2. Update status & processed_at
    UPDATE public.refunds 
    SET status = 'COMPLETED',
        processed_at = NOW(),
        updated_at = NOW()
    WHERE id = v_refund.id;

    -- 3. Write Refund Events
    INSERT INTO public.refund_events (refund_id, event_type, metadata)
    VALUES (v_refund.id, 'WEBHOOK_RECEIVED', jsonb_build_object('provider_refund_id', p_provider_refund_id));

    INSERT INTO public.refund_events (refund_id, event_type, metadata)
    VALUES (v_refund.id, 'COMPLETED', jsonb_build_object('processed_at', NOW()));

    -- Create booking event
    INSERT INTO public.booking_events (booking_id, event_type, payload, correlation_id)
    VALUES (v_refund.booking_id, 'REFUND_COMPLETED', jsonb_build_object('refund_id', v_refund.id, 'amount', v_refund.amount), p_correlation_id);

    -- 4. Get original booking to read advance_paid
    SELECT * INTO v_booking FROM public.bookings WHERE id = v_refund.booking_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Associated booking not found';
    END IF;

    -- Update booking refund status
    UPDATE public.bookings 
    SET refund_status = 'COMPLETED',
        refund_completed_at = NOW(),
        refund_reference = p_provider_refund_id
    WHERE id = v_refund.booking_id;

    -- 5. Post Phase B Ledger entry: Debits 2130 (Refund Pending Liability), Credits 1110 (Operating Bank)
    IF v_booking.advance_paid > 0 AND v_refund.amount > 0 THEN
        SELECT id INTO v_transaction_id FROM public.financial_transactions WHERE provider_reference = v_refund.payment_id LIMIT 1;
        
        IF v_transaction_id IS NULL THEN
            INSERT INTO public.financial_transactions (
                transaction_type, status, provider, provider_reference, amount, currency, booking_id, payment_id
            ) VALUES (
                'PAYMENT', 'COMPLETED', 'RAZORPAY', v_refund.payment_id, v_booking.advance_paid, 'INR', v_refund.booking_id, v_refund.payment_id
            ) RETURNING id INTO v_transaction_id;
        END IF;

        PERFORM public.post_journal(
            'REFUND_COMPLETED'::business_event_type,
            v_transaction_id,
            'ledger_ref_' || v_refund.id::text,
            jsonb_build_array(
                jsonb_build_object('account_code', 2130, 'debit', v_refund.amount, 'credit', 0),
                jsonb_build_object('account_code', 1110, 'debit', 0, 'credit', v_refund.amount)
            )
        );
    END IF;

    v_result := jsonb_build_object(
        'success', true,
        'refund_id', v_refund.id,
        'booking_id', v_refund.booking_id,
        'amount', v_refund.amount,
        'status', 'COMPLETED'
    );
    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION '%', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Atomic PL/pgSQL function to fail refund
CREATE OR REPLACE FUNCTION public.rpc_fail_refund_v1(
    p_provider_refund_id TEXT,
    p_error_message TEXT,
    p_correlation_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_refund RECORD;
    v_result JSONB;
BEGIN
    SELECT * INTO v_refund FROM public.refunds WHERE refund_id = p_provider_refund_id FOR UPDATE;
    IF NOT FOUND THEN
        SELECT * INTO v_refund FROM public.refunds WHERE idempotency_key = p_provider_refund_id FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Refund record not found for provider reference %', p_provider_refund_id;
        END IF;
    END IF;

    IF v_refund.status = 'COMPLETED' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot fail a completed refund');
    END IF;

    UPDATE public.refunds 
    SET status = 'FAILED',
        updated_at = NOW()
    WHERE id = v_refund.id;

    INSERT INTO public.refund_events (refund_id, event_type, metadata)
    VALUES (v_refund.id, 'FAILED', jsonb_build_object('error', p_error_message, 'timestamp', NOW()));

    -- Update booking refund status
    UPDATE public.bookings 
    SET refund_status = 'FAILED'
    WHERE id = v_refund.booking_id;

    v_result := jsonb_build_object(
        'success', true,
        'refund_id', v_refund.id,
        'booking_id', v_refund.booking_id,
        'status', 'FAILED'
    );
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
