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
