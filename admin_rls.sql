-- Admin RLS Policies

-- 1. Venues (Approve, Disable, Delete)
create policy "Admins manage venues" on public.venues for all using (
  exists (select 1 from public.users where id = auth.uid() and role = 'ADMIN')
);

-- 2. Users (Suspend, Manage)
create policy "Admins manage users" on public.users for all using (
  exists (select 1 from public.users where id = auth.uid() and role = 'ADMIN')
);

-- 3. Owner Profiles
create policy "Admins manage owner profiles" on public.owner_profiles for all using (
  exists (select 1 from public.users where id = auth.uid() and role = 'ADMIN')
);

-- 4. Customer Profiles
create policy "Admins manage customer profiles" on public.customer_profiles for all using (
  exists (select 1 from public.users where id = auth.uid() and role = 'ADMIN')
);

-- 5. Bookings
create policy "Admins manage bookings" on public.bookings for all using (
  exists (select 1 from public.users where id = auth.uid() and role = 'ADMIN')
);
