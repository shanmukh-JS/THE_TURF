-- Fix Bookings RLS

-- 1. Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies (to recreate them cleanly)
DROP POLICY IF EXISTS "Customers can view their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Owners can view bookings for their venues" ON public.bookings;
DROP POLICY IF EXISTS "Super Admins can view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Customers can insert their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Customers can update their own bookings" ON public.bookings;

-- 3. Create SELECT policies
CREATE POLICY "Customers can view their own bookings" 
ON public.bookings FOR SELECT 
USING (auth.uid() = customer_id);

CREATE POLICY "Owners can view bookings for their venues" 
ON public.bookings FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.venues v
    WHERE v.id = bookings.venue_id
    AND v.owner_id = auth.uid()
  )
);

CREATE POLICY "Super Admins can view all bookings" 
ON public.bookings FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'SUPER_ADMIN'
  )
);

-- 4. Create INSERT policy (Customers booking)
CREATE POLICY "Customers can insert their own bookings" 
ON public.bookings FOR INSERT 
WITH CHECK (auth.uid() = customer_id);

-- 5. Create UPDATE policy (Cancel/modify)
DROP POLICY IF EXISTS "Customers can update their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Owners can update bookings for their venues" ON public.bookings;
DROP POLICY IF EXISTS "Super Admins can update all bookings" ON public.bookings;
CREATE POLICY "Customers can update their own bookings" 
ON public.bookings FOR UPDATE 
USING (auth.uid() = customer_id)
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Owners can update bookings for their venues" 
ON public.bookings FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.venues v
    WHERE v.id = bookings.venue_id
    AND v.owner_id = auth.uid()
  )
);

CREATE POLICY "Super Admins can update all bookings" 
ON public.bookings FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'SUPER_ADMIN'
  )
);

