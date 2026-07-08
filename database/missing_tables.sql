-- Enable Row Level Security and setup OTP & Email Tables

-- 1. EMAIL SETTINGS TABLE
create table if not exists public.email_settings (
  id uuid default uuid_generate_v4() primary key,
  sender_name text not null,
  sender_email text not null,
  reply_to_email text,
  smtp_host text,
  smtp_port integer,
  smtp_username text,
  smtp_password text, -- encrypted
  encryption_type text check (encryption_type in ('TLS', 'SSL', 'None')),
  provider text default 'smtp' not null,
  is_enabled boolean default true not null,
  is_verified boolean default false not null,
  last_tested_at timestamp with time zone,
  last_test_status text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_by uuid references auth.users(id) on delete set null
);

-- 2. TEMP REGISTRATIONS TABLE
create table if not exists public.temp_registrations (
  id uuid default uuid_generate_v4() primary key,
  email text unique not null,
  name text not null,
  phone text not null,
  password_hash text not null,
  role text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. OTP VERIFICATION TABLE
create table if not exists public.otp_verification (
  id uuid default uuid_generate_v4() primary key,
  email text not null,
  user_id uuid references auth.users(id) on delete cascade,
  otp_hash text not null,
  purpose text not null check (purpose in ('registration', 'forgot_password', 'email_verification', 'email_change')),
  expires_at timestamp with time zone not null,
  attempts integer default 0 not null,
  resend_count integer default 0 not null,
  status text default 'pending' check (status in ('pending', 'verified', 'expired', 'blocked')) not null,
  used_at timestamp with time zone,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. EMAIL LOGS TABLE
create table if not exists public.email_logs (
  id uuid default uuid_generate_v4() primary key,
  recipient text not null,
  subject text not null,
  template text not null,
  status text not null check (status in ('Sent', 'Failed')),
  provider text not null,
  message_id text,
  delivery_time_ms integer,
  opened boolean default false not null,
  error_message text,
  retry_count integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.email_settings enable row level security;
alter table public.temp_registrations enable row level security;
alter table public.otp_verification enable row level security;
alter table public.email_logs enable row level security;

-- Setup Admin Policies (Only Admin users can read / modify the tables directly)
create policy "Admins manage email settings" on public.email_settings
  for all to authenticated
  using (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'ADMIN'))
  with check (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'ADMIN'));

create policy "Admins manage temp registrations" on public.temp_registrations
  for all to authenticated
  using (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'ADMIN'))
  with check (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'ADMIN'));

create policy "Admins manage otp verification" on public.otp_verification
  for all to authenticated
  using (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'ADMIN'))
  with check (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'ADMIN'));

create policy "Admins manage email logs" on public.email_logs
  for all to authenticated
  using (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'ADMIN'))
  with check (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'ADMIN'));

-- Insert default email setting configuration
insert into public.email_settings (sender_name, sender_email, is_enabled, provider)
values ('TRUF GAMING', '3shanmukhkadali@gmail.com', true, 'smtp')
on conflict do nothing;
-- ==============================================================================
-- ADMIN SETTINGS EXPANSION
-- Please run this script in your Supabase SQL Editor
-- ==============================================================================

-- Add missing settings columns to the 'admin_settings' table
ALTER TABLE public.admin_settings 
ADD COLUMN IF NOT EXISTS max_payout_limit integer DEFAULT 100000,
ADD COLUMN IF NOT EXISTS mfa_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS session_timeout_mins integer DEFAULT 60,
ADD COLUMN IF NOT EXISTS notify_on_new_turf boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_on_new_booking boolean DEFAULT true;

-- Reload postgREST schema cache so the API detects the new columns instantly
NOTIFY pgrst, 'reload schema';
-- ==============================================================================
-- ENTERPRISE VERIFICATION UPDATE
-- Please run this script in your Supabase SQL Editor
-- ==============================================================================

-- 1. Create a new storage bucket for Venue Documents (Govt IDs, Registration, etc.)
insert into storage.buckets (id, name, public)
values ('venue_documents', 'venue_documents', true)
on conflict (id) do nothing;

-- Set up storage policies for the documents bucket
drop policy if exists "Public Access Documents" on storage.objects;
create policy "Public Access Documents"
  on storage.objects for select
  using ( bucket_id = 'venue_documents' );

drop policy if exists "Auth Users can upload documents" on storage.objects;
create policy "Auth Users can upload documents"
  on storage.objects for insert
  with check ( bucket_id = 'venue_documents' and auth.role() = 'authenticated' );

drop policy if exists "Auth Users can update their documents" on storage.objects;
create policy "Auth Users can update their documents"
  on storage.objects for update
  using ( bucket_id = 'venue_documents' and auth.role() = 'authenticated' );

-- 2. Add verification checklist and admin fields to the 'venues' table
ALTER TABLE public.venues 
ADD COLUMN IF NOT EXISTS admin_notes text,
ADD COLUMN IF NOT EXISTS ai_verification_score int,
ADD COLUMN IF NOT EXISTS ai_verification_recommendation text,
ADD COLUMN IF NOT EXISTS identity_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS govt_id_uploaded boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS turf_images_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS location_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS operating_hours_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS documents_url text[] DEFAULT '{}'::text[];

-- NOTE: This also implicitly reloads the schema cache for the PostgREST API so the 'amenities' column error should disappear.
NOTIFY pgrst, 'reload schema';
-- CREATE FAVORITES TABLE
create table if not exists public.favorites (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  venue_id uuid references public.venues(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, venue_id)
);

alter table public.favorites enable row level security;

drop policy if exists "Users can read own favorites" on public.favorites;
create policy "Users can read own favorites" 
  on public.favorites for select 
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own favorites" on public.favorites;
create policy "Users can insert own favorites" 
  on public.favorites for insert 
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own favorites" on public.favorites;
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

drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications" 
  on public.notifications for select 
  using (auth.uid() = user_id);

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications" 
  on public.notifications for update 
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Allow admins or system to insert notifications
drop policy if exists "Admins can insert notifications" on public.notifications;
create policy "Admins can insert notifications"
  on public.notifications for insert
  with check (public.is_admin());

-- Re-enable RLS on the new tables and use the safe admin policy
drop policy if exists "Admins manage favorites" on public.favorites;
create policy "Admins manage favorites" on public.favorites for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage notifications" on public.notifications;
create policy "Admins manage notifications" on public.notifications for all using (public.is_admin()) with check (public.is_admin());
