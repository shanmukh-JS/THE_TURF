-- Comprehensive Fix for Dashboard Visibility (Super Admin & Owner)
-- Run this script in your Supabase SQL Editor

BEGIN;

-- 1. Ensure the is_admin() function correctly bypasses RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
  );
END;
$$;

-- 2. Bookings Table RLS (Drives all dashboards)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Super Admins can view all bookings" ON public.bookings;
CREATE POLICY "Admin view all bookings" 
ON public.bookings FOR SELECT 
USING (public.is_admin());

DROP POLICY IF EXISTS "Owner view their bookings" ON public.bookings;
DROP POLICY IF EXISTS "Owners can view bookings for their venues" ON public.bookings;
CREATE POLICY "Owner view their bookings" 
ON public.bookings FOR SELECT 
USING (
  venue_id IN (
    SELECT v.id FROM public.venues v
    JOIN public.owner_profiles op ON v.owner_id = op.id
    WHERE op.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Customer view their bookings" ON public.bookings;
DROP POLICY IF EXISTS "Customers can view their own bookings" ON public.bookings;
CREATE POLICY "Customer view their bookings" 
ON public.bookings FOR SELECT 
USING (customer_id = auth.uid());


-- 3. Financial Ledger Table RLS
ALTER TABLE public.financial_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin view all ledger" ON public.financial_ledger;
CREATE POLICY "Admin view all ledger" 
ON public.financial_ledger FOR SELECT 
USING (public.is_admin());

DROP POLICY IF EXISTS "Owner view their ledger" ON public.financial_ledger;
CREATE POLICY "Owner view their ledger" 
ON public.financial_ledger FOR SELECT 
USING (
  actor_id = auth.uid()
  OR
  reference_id IN (
    SELECT id::text FROM public.bookings b
    WHERE b.venue_id IN (
      SELECT v.id FROM public.venues v
      JOIN public.owner_profiles op ON v.owner_id = op.id
      WHERE op.user_id = auth.uid()
    )
  )
);

COMMIT;
