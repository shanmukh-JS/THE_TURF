-- COMPLETELY RESET ADMIN RLS POLICIES TO FIX INFINITE RECURSION

-- 1. Drop ALL potentially problematic policies
drop policy if exists "Admins manage venues" on public.venues;
drop policy if exists "Admins manage users" on public.users;
drop policy if exists "Admins manage owner profiles" on public.owner_profiles;
drop policy if exists "Admins manage customer profiles" on public.customer_profiles;
drop policy if exists "Admins manage bookings" on public.bookings;
drop policy if exists "Admins read all users" on public.users;

-- 2. Create the secure admin check function
create or replace function public.is_admin()
returns boolean as $$
declare
  is_admin boolean;
begin
  select exists (
    select 1 from public.users 
    where id = auth.uid() and role = 'ADMIN'
  ) into is_admin;
  return is_admin;
end;
$$ language plpgsql security definer set search_path = public;

-- 3. Re-create policies using the secure function

create policy "Admins manage venues" on public.venues for all using (public.is_admin());
create policy "Admins manage users" on public.users for all using (public.is_admin());
create policy "Admins manage owner profiles" on public.owner_profiles for all using (public.is_admin());
create policy "Admins manage customer profiles" on public.customer_profiles for all using (public.is_admin());
create policy "Admins manage bookings" on public.bookings for all using (public.is_admin());
