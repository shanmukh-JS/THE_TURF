-- Drop the recursive policies causing the Infinite Recursion error
DROP POLICY IF EXISTS "Admin read all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admin read all customer profiles" ON public.customer_profiles;
DROP POLICY IF EXISTS "Admin read all users" ON public.users;

-- Drop standard ones that might be conflicting or recursive
DROP POLICY IF EXISTS "Admins manage bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins manage customer profiles" ON public.customer_profiles;
DROP POLICY IF EXISTS "Admins manage users" ON public.users;

-- Ensure public.is_admin() function exists and is compiled properly
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate policies using the safe public.is_admin() function
-- 1. Allow ADMIN to manage all bookings
CREATE POLICY "Admins manage bookings" ON public.bookings 
  FOR ALL TO authenticated 
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 2. Allow ADMIN to manage all customer profiles
CREATE POLICY "Admins manage customer profiles" ON public.customer_profiles 
  FOR ALL TO authenticated 
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3. Allow ADMIN to manage all users (this prevents infinite recursion on public.users table)
CREATE POLICY "Admins manage users" ON public.users 
  FOR ALL TO authenticated 
  USING (public.is_admin() OR auth.uid() = id)
  WITH CHECK (public.is_admin() OR auth.uid() = id);
