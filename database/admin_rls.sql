-- Fix Infinite Recursion in Admin RLS Policies

-- Drop the broken policies that cause infinite recursion
drop policy if exists "Admins manage venues" on public.venues;
drop policy if exists "Admins manage users" on public.users;
drop policy if exists "Admins manage owner profiles" on public.owner_profiles;
drop policy if exists "Admins manage customer profiles" on public.customer_profiles;
drop policy if exists "Admins manage bookings" on public.bookings;

-- Create a secure function to check admin status that bypasses RLS
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.users 
    where id = auth.uid() and role = 'ADMIN'
  );
end;
$$ language plpgsql security definer set search_path = public;

-- Recreate policies using the secure function

-- 1. Venues (Approve, Disable, Delete)
create policy "Admins manage venues" on public.venues for all using (
  public.is_admin()
);

-- 2. Users (Suspend, Manage)
create policy "Admins manage users" on public.users for all using (
  public.is_admin()
);

-- 3. Owner Profiles
create policy "Admins manage owner profiles" on public.owner_profiles for all using (
  public.is_admin()
);

-- 4. Customer Profiles
create policy "Admins manage customer profiles" on public.customer_profiles for all using (
  public.is_admin()
);

-- 5. Bookings
create policy "Admins manage bookings" on public.bookings for all using (
  public.is_admin()
);
