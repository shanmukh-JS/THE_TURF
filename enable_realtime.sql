-- Enable Supabase Realtime for Dashboard Tables
-- Run this in your Supabase SQL Editor

-- 1. Ensure the publication exists (it usually does by default)
BEGIN;

-- 2. Add the tables to the supabase_realtime publication
-- This allows the frontend to listen for INSERT/UPDATE/DELETE events automatically
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.owner_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_profiles;

-- Missing tables for real-time live updates on the dashboards
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.slots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.venues;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_ledger;

-- Note: If you get a warning that they are already in the publication, that is fine!
COMMIT;
