-- Fix Admin Row Level Security (RLS) Policies
-- Run this in your Supabase SQL Editor to ensure the Admin Dashboard can see all users

-- 1. Ensure the is_admin() function correctly bypasses RLS to check the role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
END;
$$;

-- 2. Drop existing potentially broken admin policies
DROP POLICY IF EXISTS "Admins manage owner profiles" ON public.owner_profiles;
DROP POLICY IF EXISTS "Admins manage customer profiles" ON public.customer_profiles;
DROP POLICY IF EXISTS "Admins manage users" ON public.users;

-- 3. Create fresh admin policies for all tables needed in the Users Directory
CREATE POLICY "Admins manage owner profiles" ON public.owner_profiles FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage customer profiles" ON public.customer_profiles FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage users" ON public.users FOR ALL USING (public.is_admin());

-- 4. Just in case, ensure RLS is enabled on these tables
ALTER TABLE public.owner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
