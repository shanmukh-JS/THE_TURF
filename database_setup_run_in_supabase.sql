-- ==============================================================================
-- TRUF GAMING — Complete Database Setup & Migration Script
-- Copy the entire contents of this file and paste it into the "SQL Editor"
-- of your Supabase Dashboard (https://supabase.com), then click "Run".
-- ==============================================================================

-- 1. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  actor_id uuid NOT NULL,
  module text NOT NULL, -- AUTH, BOOKING, PAYMENT, VENUE, ADMIN, OWNER, SYSTEM
  action text NOT NULL,
  target_id text,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  user_agent text,
  request_id text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON public.audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access to audit_logs" ON public.audit_logs;
CREATE POLICY "Service role full access to audit_logs"
  ON public.audit_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);


-- 2. FINANCIAL LEDGER TABLE (Immutable)
CREATE TABLE IF NOT EXISTS public.financial_ledger (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  reference_id text NOT NULL,  -- booking_id, settlement_id, etc.
  entry_type text NOT NULL,    -- BOOKING_PAYMENT, PLATFORM_COMMISSION, OWNER_CREDIT, CUSTOMER_REFUND, PAYOUT
  debit numeric DEFAULT 0 NOT NULL,
  credit numeric DEFAULT 0 NOT NULL,
  balance_after numeric DEFAULT 0 NOT NULL,
  actor_id uuid NOT NULL,
  description text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ledger_reference ON public.financial_ledger(reference_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entry_type ON public.financial_ledger(entry_type);
CREATE INDEX IF NOT EXISTS idx_ledger_actor ON public.financial_ledger(actor_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created ON public.financial_ledger(created_at DESC);

ALTER TABLE public.financial_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access to financial_ledger" ON public.financial_ledger;
CREATE POLICY "Service role full access to financial_ledger"
  ON public.financial_ledger
  FOR ALL
  USING (true)
  WITH CHECK (true);


-- 3. WEBHOOK LOGS TABLE (Idempotency)
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id text UNIQUE NOT NULL,   -- Razorpay event_id for deduplication
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status text DEFAULT 'processed' NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_id ON public.webhook_logs(event_id);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access to webhook_logs" ON public.webhook_logs;
CREATE POLICY "Service role full access to webhook_logs"
  ON public.webhook_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);


-- 4. PAYMENT AUDIT TABLE (Financial Traceability)
CREATE TABLE IF NOT EXISTS public.payment_audit (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
    user_id uuid REFERENCES public.users(id) ON DELETE SET NULL NOT NULL,
    checkout_id text,
    razorpay_order_id text,
    razorpay_payment_id text,
    razorpay_signature text,
    status text NOT NULL CHECK (status IN (
        'CHECKOUT_INITIATED',
        'ORDER_CREATED',
        'PAYMENT_PENDING',
        'PAYMENT_SUCCESS',
        'PAYMENT_FAILED',
        'SIGNATURE_VERIFIED',
        'SIGNATURE_FAILED',
        'BOOKING_CONFIRMED',
        'REFUND_INITIATED',
        'REFUND_COMPLETED',
        'REFUND_FAILED'
    )),
    amount numeric NOT NULL DEFAULT 0,
    currency text DEFAULT 'INR' NOT NULL,
    ip_address text,
    user_agent text,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_audit_user ON public.payment_audit (user_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_booking ON public.payment_audit (booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_order ON public.payment_audit (razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_status ON public.payment_audit (status);
CREATE INDEX IF NOT EXISTS idx_payment_audit_created ON public.payment_audit (created_at DESC);

ALTER TABLE public.payment_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access to payment_audit" ON public.payment_audit;
CREATE POLICY "Service role full access to payment_audit"
  ON public.payment_audit
  FOR ALL
  USING (true)
  WITH CHECK (true);


-- 5. COLUMNS AND STATE ALTERATIONS
ALTER TABLE public.webhook_logs ADD COLUMN IF NOT EXISTS provider text DEFAULT 'razorpay';

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'UNPAID'
  CHECK (payment_status IN ('UNPAID', 'PAYMENT_PENDING', 'PAYMENT_SUCCESS', 'PAYMENT_VERIFIED', 'REFUND_INITIATED', 'REFUND_COMPLETED'));

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS checkout_id text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS razorpay_order_id text;


-- 6. STORED PROCEDURE: rpc_book_slot
CREATE OR REPLACE FUNCTION public.rpc_book_slot(
  p_slot_id uuid,
  p_venue_id uuid,
  p_customer_id uuid,
  p_total_amount numeric,
  p_advance_paid numeric,
  p_payment_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_slot RECORD;
  v_booking_id uuid;
BEGIN
  -- Lock the specific slot row to prevent concurrent bookings
  SELECT * INTO v_slot
  FROM public.slots
  WHERE id = p_slot_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Slot not found.';
  END IF;

  IF v_slot.is_booked THEN
    RAISE EXCEPTION 'This slot has already been booked.';
  END IF;

  IF v_slot.status != 'Available' THEN
    RAISE EXCEPTION 'This slot is not available for booking.';
  END IF;

  -- Mark slot as booked
  UPDATE public.slots
  SET is_booked = true,
      is_locked = false,
      lock_expires = NULL,
      status = 'Booked',
      updated_at = now()
  WHERE id = p_slot_id;

  -- Create booking record
  INSERT INTO public.bookings (slot_id, venue_id, customer_id, total_amount, advance_paid, status, payment_id)
  VALUES (p_slot_id, p_venue_id, p_customer_id, p_total_amount, p_advance_paid, 'CONFIRMED', p_payment_id)
  RETURNING id INTO v_booking_id;

  -- Record in financial ledger
  INSERT INTO public.financial_ledger (reference_id, entry_type, debit, credit, balance_after, actor_id, description)
  VALUES (v_booking_id::text, 'BOOKING_PAYMENT', p_total_amount, 0, 0, p_customer_id, 'Booking payment received');

  RETURN v_booking_id;
END;
$$;


-- 7. PG_CRON SCHEDULE FOR EXPIRED SLOT LOCKS
-- Note: If pg_cron is not enabled or throws a permissions error, you can enable it 
-- in the Supabase Extensions UI, or skip this block.
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing schedule if it exists to prevent duplication
SELECT cron.unschedule('unlock-expired-slots') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'unlock-expired-slots'
);

SELECT cron.schedule(
  'unlock-expired-slots',
  '*/2 * * * *',
  $$
    UPDATE public.slots
    SET is_locked = false,
        lock_expires = NULL,
        updated_at = now()
    WHERE is_locked = true
      AND lock_expires < now();
  $$
);


-- 8. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
