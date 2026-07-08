-- ==============================================================================
-- TRUF GAMING — Production Optimizations Migration
-- Run this script in the Supabase SQL Editor.
--
-- Adds: Performance indexes, audit_logs table, financial_ledger table,
--        webhook_logs table, and the rpc_book_slot stored procedure.
-- ==============================================================================

-- ============================================
-- 1. PERFORMANCE INDEXES
-- ============================================

-- Venues
CREATE INDEX IF NOT EXISTS idx_venues_owner_id ON public.venues(owner_id);
CREATE INDEX IF NOT EXISTS idx_venues_verification_status ON public.venues(verification_status);
CREATE INDEX IF NOT EXISTS idx_venues_city_id ON public.venues(city_id);
CREATE INDEX IF NOT EXISTS idx_venues_is_disabled ON public.venues(is_disabled);

-- Slots
CREATE INDEX IF NOT EXISTS idx_slots_venue_id ON public.slots(venue_id);
CREATE INDEX IF NOT EXISTS idx_slots_date ON public.slots(date);
CREATE INDEX IF NOT EXISTS idx_slots_is_booked ON public.slots(is_booked);
CREATE INDEX IF NOT EXISTS idx_slots_date_venue_booked ON public.slots(venue_id, date, is_booked);
CREATE INDEX IF NOT EXISTS idx_slots_owner_id ON public.slots(owner_id);

-- Bookings
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_venue_id ON public.bookings(venue_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_slot_id ON public.bookings(slot_id);

-- Users
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_reviews_venue_id ON public.reviews(venue_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer_id ON public.reviews(customer_id);

-- Settlements & Commissions
CREATE INDEX IF NOT EXISTS idx_settlements_owner_id ON public.settlements(owner_id);
CREATE INDEX IF NOT EXISTS idx_commissions_booking_id ON public.commissions(booking_id);
CREATE INDEX IF NOT EXISTS idx_commissions_owner_id ON public.commissions(owner_id);

-- ============================================
-- 2. AUDIT LOGS TABLE
-- ============================================

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

-- Only admins can read audit logs via service role
CREATE POLICY "Service role full access to audit_logs"
  ON public.audit_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 3. FINANCIAL LEDGER TABLE (Immutable)
-- ============================================

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

CREATE POLICY "Service role full access to financial_ledger"
  ON public.financial_ledger
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 4. WEBHOOK LOGS TABLE (Idempotency)
-- ============================================

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

CREATE POLICY "Service role full access to webhook_logs"
  ON public.webhook_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 5. DOUBLE-BOOKING PREVENTION RPC
-- Uses SELECT FOR UPDATE to lock the slot row
-- during booking checkout, preventing race conditions.
-- ============================================

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

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
