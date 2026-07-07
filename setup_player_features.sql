-- CREATE FAVORITES TABLE
create table if not exists public.favorites (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  venue_id uuid references public.venues(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, venue_id)
);

alter table public.favorites enable row level security;

create policy "Users can read own favorites" 
  on public.favorites for select 
  using (auth.uid() = user_id);

create policy "Users can insert own favorites" 
  on public.favorites for insert 
  with check (auth.uid() = user_id);

create policy "Users can delete own favorites" 
  on public.favorites for delete 
  using (auth.uid() = user_id);

-- CREATE NOTIFICATIONS TABLE
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  message text not null,
  type text default 'INFO' check (type in ('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'BOOKING')),
  is_read boolean default false not null,
  link text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.notifications enable row level security;

create policy "Users can read own notifications" 
  on public.notifications for select 
  using (auth.uid() = user_id);

create policy "Users can update own notifications" 
  on public.notifications for update 
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Allow admins or system to insert notifications
create policy "Admins can insert notifications"
  on public.notifications for insert
  with check (public.is_admin());

-- Re-enable RLS on the new tables and use the safe admin policy
create policy "Admins manage favorites" on public.favorites for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage notifications" on public.notifications for all using (public.is_admin()) with check (public.is_admin());
