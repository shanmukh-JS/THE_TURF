-- ============================================================================
-- PRODUCTION RESET SCRIPT - REMOVE FAKE / DEFAULT DATA
-- ============================================================================
-- IMPORTANT: Run this ONLY when you want to wipe all testing data.
-- This will delete all bookings, slots, reviews, notifications, and dummy venues.
-- Your admin settings, user accounts, and real users will remain.

BEGIN;

-- 1. Wipe all transactional testing data
TRUNCATE TABLE public.booking_reviews CASCADE;
TRUNCATE TABLE public.bookings CASCADE;
TRUNCATE TABLE public.slots CASCADE;
TRUNCATE TABLE public.notifications CASCADE;
TRUNCATE TABLE public.refunds CASCADE;
TRUNCATE TABLE public.financial_ledger_entries CASCADE;

-- 2. (Optional) Wipe venues if you want to recreate them from scratch.
-- Uncomment the next two lines if you want to delete all venues:
-- TRUNCATE TABLE public.venue_images CASCADE;
-- TRUNCATE TABLE public.venues CASCADE;

-- 3. Ensure Real-Time is Fully Enabled for Live Production (Lively!)
-- This guarantees the "Lively" aspect works instantly without refreshing.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- Add all critical tables to Realtime so the frontend updates lively
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.slots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.venues;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

COMMIT;
