
-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- USERS (Mirrors auth.users)
create table public.users (
  id uuid references auth.users(id) on delete cascade not null primary key,
  email text unique not null,
  phone text unique,
  role text not null check (role in ('OWNER', 'CUSTOMER', 'ADMIN')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- CUSTOMER PROFILES
create table public.customer_profiles (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade unique not null,
  full_name text not null
);

-- OWNER PROFILES
create table public.owner_profiles (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade unique not null,
  full_name text not null,
  business_name text not null
);

-- CITIES
create table public.cities (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  state text
);

-- AREAS
create table public.areas (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  city_id uuid references public.cities(id) on delete cascade not null
);

-- VENUES
create table public.venues (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references public.owner_profiles(id) on delete cascade not null,
  name text not null,
  description text,
  address text not null,
  city_id uuid references public.cities(id) on delete set null,
  area_id uuid references public.areas(id) on delete set null,
  verification_status text default 'DRAFT' not null,
  pitches int default 1 not null,
  is_indoor boolean default false not null,
  turf_type text
);

-- VENUE IMAGES
create table public.venue_images (
  id uuid default uuid_generate_v4() primary key,
  venue_id uuid references public.venues(id) on delete cascade not null,
  url text not null,
  is_cover boolean default false not null
);

-- VENUE PRICING
create table public.venue_pricing (
  id uuid default uuid_generate_v4() primary key,
  venue_id uuid references public.venues(id) on delete cascade unique not null,
  price numeric not null
);

-- SLOTS
create table public.slots (
  id uuid default uuid_generate_v4() primary key,
  venue_id uuid references public.venues(id) on delete cascade not null,
  date date not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  price numeric not null,
  is_booked boolean default false not null,
  is_locked boolean default false not null,
  lock_expires timestamp with time zone
);

-- BOOKINGS
create table public.bookings (
  id uuid default uuid_generate_v4() primary key,
  slot_id uuid references public.slots(id) on delete cascade unique not null,
  venue_id uuid references public.venues(id) on delete cascade not null,
  customer_id uuid references public.users(id) on delete cascade not null,
  total_amount numeric default 0 not null,
  advance_paid numeric default 0 not null,
  status text not null, -- e.g. CONFIRMED, CANCELLED
  payment_id text,
  qr_code text
);

-- REVIEWS
create table public.reviews (
  id uuid default uuid_generate_v4() primary key,
  venue_id uuid references public.venues(id) on delete cascade not null,
  customer_id uuid references public.users(id) on delete cascade not null,
  rating numeric not null,
  comment text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- SETTLEMENTS
create table public.settlements (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references public.owner_profiles(id) on delete cascade not null,
  amount numeric not null,
  status text not null, -- PENDING, COMPLETED
  transfer_id text
);

-- COMMISSIONS
create table public.commissions (
  id uuid default uuid_generate_v4() primary key,
  booking_id uuid references public.bookings(id) on delete cascade unique not null,
  owner_id uuid references public.owner_profiles(id) on delete cascade not null,
  amount numeric not null,
  status text not null,
  settlement_id uuid references public.settlements(id) on delete set null
);

-- RLS POLICIES
alter table public.users enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.owner_profiles enable row level security;
alter table public.venues enable row level security;
alter table public.slots enable row level security;
alter table public.bookings enable row level security;
alter table public.cities enable row level security;
alter table public.areas enable row level security;
alter table public.venue_images enable row level security;
alter table public.venue_pricing enable row level security;

-- Public can read cities, areas, venues, slots, images, pricing
create policy "Public read cities" on public.cities for select using (true);
create policy "Public read areas" on public.areas for select using (true);
create policy "Public read venues" on public.venues for select using (true);
create policy "Public read slots" on public.slots for select using (true);
create policy "Public read venue images" on public.venue_images for select using (true);
create policy "Public read venue pricing" on public.venue_pricing for select using (true);

-- Users can read their own profiles
create policy "Users read own profile" on public.users for select using (auth.uid() = id);
create policy "Customers read own profile" on public.customer_profiles for select using (user_id = auth.uid());
create policy "Customers update own profile" on public.customer_profiles for update using (user_id = auth.uid());

-- Owners can read/update own profile
create policy "Owners read own profile" on public.owner_profiles for select using (user_id = auth.uid());
create policy "Owners update own profile" on public.owner_profiles for update using (user_id = auth.uid());

-- Owners manage their venues
create policy "Owners insert venues" on public.venues for insert with check (owner_id in (select id from public.owner_profiles where user_id = auth.uid()));
create policy "Owners update venues" on public.venues for update using (owner_id in (select id from public.owner_profiles where user_id = auth.uid()));
create policy "Owners delete venues" on public.venues for delete using (owner_id in (select id from public.owner_profiles where user_id = auth.uid()));

-- Customers can insert bookings and read their own
create policy "Customers read own bookings" on public.bookings for select using (customer_id = auth.uid());
create policy "Customers insert bookings" on public.bookings for insert with check (customer_id = auth.uid());

-- Trigger for auth.users to public.users (Handles new signups)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'role', 'CUSTOMER'));
  
  if (new.raw_user_meta_data->>'role' = 'OWNER') then
    insert into public.owner_profiles (user_id, full_name, business_name)
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'New Owner'), coalesce(new.raw_user_meta_data->>'full_name', 'New Owner') || 's Business');
  else
    insert into public.customer_profiles (user_id, full_name)
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'New Customer'));
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


