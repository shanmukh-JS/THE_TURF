-- ============================================================================
-- PRODUCTION RESET SCRIPT - REMOVE FAKE / DEFAULT DATA
-- ============================================================================
-- IMPORTANT: This will delete all bookings, slots, reviews, and notifications.
-- Your admin settings, user accounts, and real users will remain.

BEGIN;

-- 1. Wipe all transactional testing data
TRUNCATE TABLE public.booking_reviews CASCADE;
TRUNCATE TABLE public.bookings CASCADE;
TRUNCATE TABLE public.slots CASCADE;
TRUNCATE TABLE public.notifications CASCADE;
TRUNCATE TABLE public.refunds CASCADE;
TRUNCATE TABLE public.financial_ledger_entries CASCADE;

COMMIT;
