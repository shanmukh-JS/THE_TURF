-- =================================================================================
-- TRUF GAMING — Phase 1 Payment System Fixes Migration
-- Run this in your Supabase SQL Editor
-- =================================================================================

-- ============================================
-- 1. PAYMENT AUDIT TABLE (Financial Traceability)
-- Every payment interaction is logged here.
-- ============================================

CREATE TABLE IF NOT EXISTS "public"."payment_audit" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "booking_id" uuid REFERENCES "public"."bookings"(id) ON DELETE SET NULL,
    "user_id" uuid REFERENCES "public"."users"(id) ON DELETE SET NULL NOT NULL,
    "checkout_id" text,
    "razorpay_order_id" text,
    "razorpay_payment_id" text,
    "razorpay_signature" text,
    "status" text NOT NULL CHECK (status IN (
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
    "amount" numeric NOT NULL DEFAULT 0,
    "currency" text DEFAULT 'INR' NOT NULL,
    "ip_address" text,
    "user_agent" text,
    "error_message" text,
    "metadata" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_audit_user ON "public"."payment_audit" ("user_id");
CREATE INDEX IF NOT EXISTS idx_payment_audit_booking ON "public"."payment_audit" ("booking_id");
CREATE INDEX IF NOT EXISTS idx_payment_audit_order ON "public"."payment_audit" ("razorpay_order_id");
CREATE INDEX IF NOT EXISTS idx_payment_audit_status ON "public"."payment_audit" ("status");
CREATE INDEX IF NOT EXISTS idx_payment_audit_created ON "public"."payment_audit" ("created_at" DESC);

ALTER TABLE "public"."payment_audit" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to payment_audit"
  ON "public"."payment_audit"
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 2. ADD PROVIDER COLUMN TO WEBHOOK LOGS
-- Supports multi-provider webhooks in the future.
-- ============================================

ALTER TABLE "public"."webhook_logs" ADD COLUMN IF NOT EXISTS "provider" text DEFAULT 'razorpay';

-- ============================================
-- 3. ADD PAYMENT STATUS STATE MACHINE TO BOOKINGS
-- Tracks the payment lifecycle separately from booking status.
-- ============================================

ALTER TABLE "public"."bookings" ADD COLUMN IF NOT EXISTS "payment_status" text DEFAULT 'UNPAID'
  CHECK (payment_status IN ('UNPAID', 'PAYMENT_PENDING', 'PAYMENT_SUCCESS', 'PAYMENT_VERIFIED', 'REFUND_INITIATED', 'REFUND_COMPLETED'));

ALTER TABLE "public"."bookings" ADD COLUMN IF NOT EXISTS "checkout_id" text;
ALTER TABLE "public"."bookings" ADD COLUMN IF NOT EXISTS "razorpay_order_id" text;

-- ============================================
-- 4. SUPABASE CRON: UNLOCK EXPIRED SLOT LOCKS
-- Runs every 2 minutes to free locked-but-expired slots.
-- Requires pg_cron extension (enabled by default in Supabase).
-- ============================================

-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule slot unlock cleanup every 2 minutes
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

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
