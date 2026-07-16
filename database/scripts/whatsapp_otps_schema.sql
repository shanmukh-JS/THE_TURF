-- =================================================================================
-- WHATSAPP OTP AUTHENTICATION SCHEMA
-- Run this in your Supabase SQL Editor
-- =================================================================================

-- 1. Create the custom OTP table
CREATE TABLE IF NOT EXISTS "public"."whatsapp_otps" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "phone_number" text NOT NULL,
    "hashed_otp" text NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "attempt_count" int DEFAULT 0,
    "resend_count" int DEFAULT 0,
    "status" text DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'FAILED', 'EXPIRED')),
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now()
);

-- 2. Create index for faster lookups by phone number
CREATE INDEX IF NOT EXISTS idx_whatsapp_otps_phone ON "public"."whatsapp_otps" ("phone_number");

-- 3. Enable RLS
ALTER TABLE "public"."whatsapp_otps" ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Only the Service Role (Backend API) should be able to read/write to this table.
-- Clients should NEVER be able to query this table directly.
DROP POLICY IF EXISTS "Deny all client access to whatsapp_otps" ON "public"."whatsapp_otps";
CREATE POLICY "Deny all client access to whatsapp_otps" 
ON "public"."whatsapp_otps" 
FOR ALL 
USING (false);
-- Service role bypasses RLS automatically.
