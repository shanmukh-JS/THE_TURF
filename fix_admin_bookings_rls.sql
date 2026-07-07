-- FIX: Allow ADMIN users to read ALL bookings and customer profiles
-- Run this in Supabase SQL Editor

-- Admin can read ALL bookings
CREATE POLICY "Admin read all bookings" ON public.bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  );

-- Admin can read ALL customer profiles
CREATE POLICY "Admin read all customer profiles" ON public.customer_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  );

-- Admin can read ALL users
CREATE POLICY "Admin read all users" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  );
