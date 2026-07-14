-- ==============================================================================
-- TRUF GAMING — Consolidated Historical Patches Migration
-- ==============================================================================

-- 1. ENUMS (Safe Creation)
DO $$ BEGIN
    CREATE TYPE owner_payable_status AS ENUM ('PENDING', 'BATCHED', 'PROCESSING', 'SETTLED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payout_batch_status AS ENUM ('DRAFT', 'APPROVED', 'PROCESSING', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payout_transfer_status AS ENUM ('INITIATED', 'PROCESSING', 'SETTLED', 'FAILED', 'REVERSED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payout_provider_event_status AS ENUM ('PENDING', 'PROCESSED', 'FAILED', 'IGNORED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. BASE TABLES Setup (Audit, Ledger, Webhooks, Payments, Rate Limits, Scheduler, Payouts)

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS public.financial_ledger (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_id text NOT NULL,
  entry_type text NOT NULL,
  debit numeric DEFAULT 0 NOT NULL,
  credit numeric DEFAULT 0 NOT NULL,
  balance_after numeric DEFAULT 0 NOT NULL,
  actor_id uuid NOT NULL,
  description text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status text DEFAULT 'processed' NOT NULL,
  provider text DEFAULT 'razorpay',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.payment_audit (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id uuid,
    user_id uuid NOT NULL,
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

CREATE TABLE IF NOT EXISTS public.rate_limits (
    key text PRIMARY KEY,
    tokens numeric NOT NULL,
    last_refill timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.scheduler_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name TEXT NOT NULL,
    scheduled_for TIMESTAMPTZ,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    status TEXT NOT NULL CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED')),
    jobs_enqueued INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER,
    trace_id TEXT,
    error_message TEXT
);

CREATE TABLE IF NOT EXISTS public.email_settings (
  id uuid DEFAULT gen_random_uuid() primary key,
  sender_name text not null,
  sender_email text not null,
  reply_to_email text,
  smtp_host text,
  smtp_port integer,
  smtp_username text,
  smtp_password text,
  encryption_type text check (encryption_type in ('TLS', 'SSL', 'None')),
  provider text default 'smtp' not null,
  is_enabled boolean default true not null,
  is_verified boolean default false not null,
  last_tested_at timestamp with time zone,
  last_test_status text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_by uuid
);

CREATE TABLE IF NOT EXISTS public.temp_registrations (
  id uuid DEFAULT gen_random_uuid() primary key,
  email text unique not null,
  name text not null,
  phone text not null,
  password_hash text not null,
  role text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE TABLE IF NOT EXISTS public.otp_verification (
  id uuid DEFAULT gen_random_uuid() primary key,
  email text not null,
  user_id uuid,
  otp_hash text not null,
  purpose text not null check (purpose in ('registration', 'forgot_password', 'email_verification', 'email_change')),
  expires_at timestamp with time zone not null,
  attempts integer default 0 not null,
  resend_count integer default 0 not null,
  status text default 'pending' check (status in ('pending', 'verified', 'expired', 'blocked')) not null,
  used_at timestamp with time zone,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid DEFAULT gen_random_uuid() primary key,
  recipient text not null,
  subject text not null,
  template text not null,
  status text not null check (status in ('Sent', 'Failed')),
  provider text not null,
  message_id text,
  delivery_time_ms integer,
  opened boolean default false not null,
  error_message text,
  retry_count integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid DEFAULT gen_random_uuid() primary key,
  user_id uuid not null,
  venue_id uuid not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, venue_id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() primary key,
  user_id uuid not null,
  title text not null,
  message text not null,
  type text default 'INFO' check (type in ('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'BOOKING')),
  is_read boolean default false not null,
  link text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Payout Tables
CREATE TABLE IF NOT EXISTS public.payout_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    old_state JSONB,
    new_state JSONB,
    reason TEXT,
    executed_by UUID NOT NULL,
    correlation_id UUID,
    journal_id UUID,
    provider_event_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payout_provider_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL,
    provider_event_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status payout_provider_event_status NOT NULL DEFAULT 'PENDING',
    error_message TEXT,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    CONSTRAINT uq_payout_provider_event UNIQUE (provider, provider_event_id)
);

CREATE TABLE IF NOT EXISTS public.owner_payables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    booking_id UUID NOT NULL,
    journal_id UUID NOT NULL,
    amount BIGINT NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
    status owner_payable_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    batched_at TIMESTAMPTZ,
    processing_at TIMESTAMPTZ,
    settled_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    CONSTRAINT uq_owner_payable_booking UNIQUE (booking_id)
);

CREATE TABLE IF NOT EXISTS public.payout_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_id VARCHAR(50) NOT NULL UNIQUE,
    status payout_batch_status NOT NULL DEFAULT 'DRAFT',
    total_amount BIGINT NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    item_count INTEGER NOT NULL DEFAULT 0 CHECK (item_count >= 0),
    created_by UUID NOT NULL,
    approved_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    processing_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.payout_batch_items (
    batch_id UUID NOT NULL REFERENCES public.payout_batches(id) ON DELETE RESTRICT,
    payable_id UUID NOT NULL REFERENCES public.owner_payables(id) ON DELETE RESTRICT,
    amount BIGINT NOT NULL CHECK (amount > 0),
    PRIMARY KEY (batch_id, payable_id)
);

CREATE TABLE IF NOT EXISTS public.payout_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.payout_batches(id) ON DELETE RESTRICT,
    owner_id UUID NOT NULL,
    amount BIGINT NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
    status payout_transfer_status NOT NULL DEFAULT 'INITIATED',
    provider VARCHAR(50) NOT NULL,
    provider_transfer_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processing_at TIMESTAMPTZ,
    settled_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    CONSTRAINT uq_batch_owner_transfer UNIQUE (batch_id, owner_id)
);

CREATE TABLE IF NOT EXISTS public.payout_transfer_items (
    transfer_id UUID NOT NULL REFERENCES public.payout_transfers(id) ON DELETE RESTRICT,
    payable_id UUID NOT NULL REFERENCES public.owner_payables(id) ON DELETE RESTRICT,
    PRIMARY KEY (transfer_id, payable_id)
);

CREATE TABLE IF NOT EXISTS public.payout_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID NOT NULL REFERENCES public.payout_transfers(id) ON DELETE RESTRICT,
    provider_settlement_id VARCHAR(255) NOT NULL,
    journal_id UUID NOT NULL,
    amount BIGINT NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
    settled_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_provider_settlement UNIQUE (transfer_id, provider_settlement_id)
);

CREATE TABLE IF NOT EXISTS public.reconciliation_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_date DATE NOT NULL UNIQUE,
    clearing_balance_match BOOLEAN NOT NULL,
    liability_balance_match BOOLEAN NOT NULL,
    total_settlements_value BIGINT NOT NULL DEFAULT 0,
    discrepancy_notes TEXT,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    executed_by UUID NOT NULL
);

-- ==============================================================================
-- 3. ALTERATIONS ON EXISTING DATABASE TABLES

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'UNPAID'
  CHECK (payment_status IN ('UNPAID', 'PAYMENT_PENDING', 'PAYMENT_SUCCESS', 'PAYMENT_VERIFIED', 'REFUND_INITIATED', 'REFUND_COMPLETED'));
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS checkout_id text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS razorpay_order_id text;

ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS banner_image_url TEXT;

ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS max_payout_limit integer DEFAULT 100000;
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS mfa_required boolean DEFAULT false;
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS session_timeout_mins integer DEFAULT 60;
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS notify_on_new_turf boolean DEFAULT true;
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS notify_on_new_booking boolean DEFAULT true;

ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS admin_notes text;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS ai_verification_score int;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS ai_verification_recommendation text;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS identity_verified boolean DEFAULT false;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS govt_id_uploaded boolean DEFAULT false;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS turf_images_verified boolean DEFAULT false;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS location_verified boolean DEFAULT false;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS operating_hours_verified boolean DEFAULT false;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS documents_url text[] DEFAULT '{}'::text[];

-- ==============================================================================
-- 4. INDEXING FOR HOT PATHS

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON public.audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ledger_reference ON public.financial_ledger(reference_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entry_type ON public.financial_ledger(entry_type);
CREATE INDEX IF NOT EXISTS idx_ledger_actor ON public.financial_ledger(actor_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created ON public.financial_ledger(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_id ON public.webhook_logs(event_id);

CREATE INDEX IF NOT EXISTS idx_payment_audit_user ON public.payment_audit (user_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_order ON public.payment_audit (razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_status ON public.payment_audit (status);
CREATE INDEX IF NOT EXISTS idx_payment_audit_created ON public.payment_audit (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scheduler_executions_job_name ON public.scheduler_executions(job_name);
CREATE INDEX IF NOT EXISTS idx_scheduler_executions_started_at ON public.scheduler_executions(started_at DESC);

-- ==============================================================================
-- 5. HELPER FUNCTIONS & PROCEDURES

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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

  UPDATE public.slots
  SET is_booked = true,
      is_locked = false,
      lock_expires = NULL,
      status = 'Booked',
      updated_at = now()
  WHERE id = p_slot_id;

  INSERT INTO public.bookings (slot_id, venue_id, customer_id, total_amount, advance_paid, status, payment_id)
  VALUES (p_slot_id, p_venue_id, p_customer_id, p_total_amount, p_advance_paid, 'CONFIRMED', p_payment_id)
  RETURNING id INTO v_booking_id;

  INSERT INTO public.financial_ledger (reference_id, entry_type, debit, credit, balance_after, actor_id, description)
  VALUES (v_booking_id::text, 'BOOKING_PAYMENT', p_total_amount, 0, 0, p_customer_id, 'Booking payment received');

  RETURN v_booking_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_key text,
    p_max_tokens numeric,
    p_refill_rate numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_now timestamp with time zone := now();
    v_elapsed numeric;
    v_tokens numeric;
    v_last_refill timestamp with time zone;
    v_allowed boolean;
    v_retry_after_ms numeric := 0;
BEGIN
    SELECT tokens, last_refill INTO v_tokens, v_last_refill
    FROM public.rate_limits
    WHERE key = p_key
    FOR UPDATE;

    IF NOT FOUND THEN
        v_tokens := p_max_tokens - 1;
        INSERT INTO public.rate_limits (key, tokens, last_refill)
        VALUES (p_key, v_tokens, v_now);
        RETURN json_build_object('allowed', true, 'remaining', floor(v_tokens), 'retryAfterMs', 0);
    END IF;

    v_elapsed := extract(epoch from (v_now - v_last_refill));
    v_tokens := least(p_max_tokens, v_tokens + (v_elapsed * p_refill_rate));

    IF v_tokens < 1 THEN
        v_allowed := false;
        v_retry_after_ms := ceil((1 - v_tokens) / p_refill_rate) * 1000;
        UPDATE public.rate_limits SET tokens = v_tokens, last_refill = v_now WHERE key = p_key;
        RETURN json_build_object('allowed', false, 'remaining', 0, 'retryAfterMs', v_retry_after_ms);
    END IF;

    v_tokens := v_tokens - 1;
    v_allowed := true;
    UPDATE public.rate_limits SET tokens = v_tokens, last_refill = v_now WHERE key = p_key;
    RETURN json_build_object('allowed', true, 'remaining', floor(v_tokens), 'retryAfterMs', 0);
END;
$$;

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES & ENFORCEMENT

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temp_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduler_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_provider_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_payables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_batch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_reports ENABLE ROW LEVEL SECURITY;

-- audit_logs
DROP POLICY IF EXISTS "Service role full access to audit_logs" ON public.audit_logs;
CREATE POLICY "Service role full access to audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- financial_ledger
DROP POLICY IF EXISTS "Service role full access to financial_ledger" ON public.financial_ledger;
CREATE POLICY "Service role full access to financial_ledger" ON public.financial_ledger FOR ALL USING (true) WITH CHECK (true);

-- webhook_logs
DROP POLICY IF EXISTS "Service role full access to webhook_logs" ON public.webhook_logs;
CREATE POLICY "Service role full access to webhook_logs" ON public.webhook_logs FOR ALL USING (true) WITH CHECK (true);

-- payment_audit
DROP POLICY IF EXISTS "Service role full access to payment_audit" ON public.payment_audit;
CREATE POLICY "Service role full access to payment_audit" ON public.payment_audit FOR ALL USING (true) WITH CHECK (true);

-- public.users
DROP POLICY IF EXISTS "Admins manage users" ON public.users;
DROP POLICY IF EXISTS "Users read own profile" ON public.users;
CREATE POLICY "Users read own profile" ON public.users FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins manage users" ON public.users FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- public.slots
DROP POLICY IF EXISTS "Users update slots state" ON public.slots;

-- public.venues
DROP POLICY IF EXISTS "Owners update venues" ON public.venues;
CREATE POLICY "Owners update venues" ON public.venues FOR UPDATE
  USING (owner_id IN (SELECT id FROM public.owner_profiles WHERE user_id = auth.uid()))
  WITH CHECK (owner_id IN (SELECT id FROM public.owner_profiles WHERE user_id = auth.uid()));

-- public.venue_pricing
DROP POLICY IF EXISTS "Owners update pricing" ON public.venue_pricing;
CREATE POLICY "Owners update pricing" ON public.venue_pricing FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.venues WHERE venues.id = venue_id AND venues.owner_id IN (SELECT id FROM public.owner_profiles WHERE user_id = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.venues WHERE venues.id = venue_id AND venues.owner_id IN (SELECT id FROM public.owner_profiles WHERE user_id = auth.uid())));

-- storage.objects
DROP POLICY IF EXISTS "Auth Users can update their documents" ON storage.objects;
CREATE POLICY "Auth Users can update their documents" ON storage.objects
  FOR UPDATE TO authenticated USING ( bucket_id = 'venue_documents' AND owner = auth.uid() ) WITH CHECK ( bucket_id = 'venue_documents' AND owner = auth.uid() );

DROP POLICY IF EXISTS "Auth Users can delete their documents" ON storage.objects;
CREATE POLICY "Auth Users can delete their documents" ON storage.objects FOR DELETE TO authenticated USING ( bucket_id = 'venue_documents' AND owner = auth.uid() );

-- Email/OTP admin policies
DROP POLICY IF EXISTS "Admins manage email settings" ON public.email_settings;
CREATE POLICY "Admins manage email settings" ON public.email_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins manage temp registrations" ON public.temp_registrations;
CREATE POLICY "Admins manage temp registrations" ON public.temp_registrations FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins manage otp verification" ON public.otp_verification;
CREATE POLICY "Admins manage otp verification" ON public.otp_verification FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins manage email logs" ON public.email_logs;
CREATE POLICY "Admins manage email logs" ON public.email_logs FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- favorites
DROP POLICY IF EXISTS "Users can read own favorites" ON public.favorites;
CREATE POLICY "Users can read own favorites" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own favorites" ON public.favorites;
CREATE POLICY "Users can insert own favorites" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own favorites" ON public.favorites;
CREATE POLICY "Users can delete own favorites" ON public.favorites FOR DELETE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins manage favorites" ON public.favorites;
CREATE POLICY "Admins manage favorites" ON public.favorites FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- notifications
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
CREATE POLICY "Users can read own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
CREATE POLICY "Admins can insert notifications" ON public.notifications FOR INSERT WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admins manage notifications" ON public.notifications;
CREATE POLICY "Admins manage notifications" ON public.notifications FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Scheduler Executions Policy
DROP POLICY IF EXISTS "scheduler_executions_service_role" ON public.scheduler_executions;
CREATE POLICY "scheduler_executions_service_role" ON public.scheduler_executions FOR ALL USING (true) WITH CHECK (true);

-- Payout Tables Policies
DROP POLICY IF EXISTS "payout_audit_logs_service" ON public.payout_audit_logs;
CREATE POLICY "payout_audit_logs_service" ON public.payout_audit_logs FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "payout_provider_events_service" ON public.payout_provider_events;
CREATE POLICY "payout_provider_events_service" ON public.payout_provider_events FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "owner_payables_service" ON public.owner_payables;
CREATE POLICY "owner_payables_service" ON public.owner_payables FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "payout_batches_service" ON public.payout_batches;
CREATE POLICY "payout_batches_service" ON public.payout_batches FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "payout_batch_items_service" ON public.payout_batch_items;
CREATE POLICY "payout_batch_items_service" ON public.payout_batch_items FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "payout_transfers_service" ON public.payout_transfers;
CREATE POLICY "payout_transfers_service" ON public.payout_transfers FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "payout_transfer_items_service" ON public.payout_transfer_items;
CREATE POLICY "payout_transfer_items_service" ON public.payout_transfer_items FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "payout_settlements_service" ON public.payout_settlements;
CREATE POLICY "payout_settlements_service" ON public.payout_settlements FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "reconciliation_reports_service" ON public.reconciliation_reports;
CREATE POLICY "reconciliation_reports_service" ON public.reconciliation_reports FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 7. DEFAULT DATA SEEDING

INSERT INTO public.email_settings (sender_name, sender_email, is_enabled, provider)
VALUES ('TRUF GAMING', '3shanmukhkadali@gmail.com', true, 'smtp')
ON CONFLICT DO NOTHING;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
