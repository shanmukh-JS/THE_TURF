-- Fix for Empty Bookings Dashboard
-- The issue is that the RLS policies for Bookings and related tables might be blocking the user from reading their own data.
-- Run this in your Supabase SQL Editor.

BEGIN;

-- 1. Bookings RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
CREATE POLICY "Users can view own bookings" ON public.bookings
    FOR SELECT TO authenticated USING (auth.uid() = customer_id);

-- 2. Slots RLS (Bookings are inner-joined with slots, so players MUST be able to read slots)
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view slots" ON public.slots;
CREATE POLICY "Anyone can view slots" ON public.slots
    FOR SELECT USING (true);

-- 3. Venues RLS (Bookings are inner-joined with venues, so players MUST be able to read venues)
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view venues" ON public.venues;
CREATE POLICY "Anyone can view venues" ON public.venues
    FOR SELECT USING (true);

-- 4. Venue Images RLS
ALTER TABLE public.venue_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view venue images" ON public.venue_images;
CREATE POLICY "Anyone can view venue images" ON public.venue_images
    FOR SELECT USING (true);

-- 5. Areas RLS
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view areas" ON public.areas;
CREATE POLICY "Anyone can view areas" ON public.areas
    FOR SELECT USING (true);

COMMIT;
