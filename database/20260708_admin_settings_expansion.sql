-- ==============================================================================
-- ADMIN SETTINGS EXPANSION
-- Please run this script in your Supabase SQL Editor
-- ==============================================================================

-- Add missing settings columns to the 'admin_settings' table
ALTER TABLE public.admin_settings 
ADD COLUMN IF NOT EXISTS max_payout_limit integer DEFAULT 100000,
ADD COLUMN IF NOT EXISTS mfa_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS session_timeout_mins integer DEFAULT 60,
ADD COLUMN IF NOT EXISTS notify_on_new_turf boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_on_new_booking boolean DEFAULT true;

-- Reload postgREST schema cache so the API detects the new columns instantly
NOTIFY pgrst, 'reload schema';
