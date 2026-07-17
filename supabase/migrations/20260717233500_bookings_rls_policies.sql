-- SQL Migration: Add RLS Policies on Bookings Table
-- Enables proper read/write controls for Customers, Venue Owners, and Admins.

BEGIN;

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 1. Policy for users to select their own bookings
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
CREATE POLICY "Users can view own bookings" ON public.bookings
    FOR SELECT TO authenticated USING (auth.uid() = customer_id);

-- 2. Policy for users to insert their own bookings
DROP POLICY IF EXISTS "Users can insert own bookings" ON public.bookings;
CREATE POLICY "Users can insert own bookings" ON public.bookings
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);

-- 3. Policy for users to update their own bookings
DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;
CREATE POLICY "Users can update own bookings" ON public.bookings
    FOR UPDATE TO authenticated USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);

-- 4. Policy for owners to view bookings of their venues
DROP POLICY IF EXISTS "Owners can view bookings for their venues" ON public.bookings;
CREATE POLICY "Owners can view bookings for their venues" ON public.bookings
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.venues 
            WHERE venues.id = bookings.venue_id 
              AND venues.owner_id = auth.uid()
        )
    );

-- 5. Policy for owners to update bookings of their venues
DROP POLICY IF EXISTS "Owners can update bookings for their venues" ON public.bookings;
CREATE POLICY "Owners can update bookings for their venues" ON public.bookings
    FOR UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.venues 
            WHERE venues.id = bookings.venue_id 
              AND venues.owner_id = auth.uid()
        )
    );

-- 6. Policy for admins to have full access
DROP POLICY IF EXISTS "Admins have full access to bookings" ON public.bookings;
CREATE POLICY "Admins have full access to bookings" ON public.bookings
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
              AND users.role = 'ADMIN'
        )
    );

COMMIT;
