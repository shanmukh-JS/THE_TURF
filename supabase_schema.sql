
-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- USERS (Mirrors auth.users)
create table public.users (
  id uuid references auth.users(id) on delete cascade not null primary key,
  email text unique not null,
  phone text unique,
  role text not null check (role in ('OWNER', 'CUSTOMER', 'ADMIN')),
  is_suspended boolean default false not null,
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
  pincode text,
  google_maps_link text,
  city_id uuid references public.cities(id) on delete set null,
  area_id uuid references public.areas(id) on delete set null,
  verification_status text default 'DRAFT' not null,
  pitches int default 1 not null,
  is_indoor boolean default false not null,
  turf_type text,
  surface text,
  size text,
  max_players int,
  amenities jsonb default '[]'::jsonb,
  opening_time time without time zone,
  closing_time time without time zone,
  weekly_holidays jsonb default '[]'::jsonb,
  slot_duration int default 60,
  is_disabled boolean default false not null
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
  price numeric not null,
  weekend_price numeric,
  peak_price numeric,
  advance_limit int default 15
);

-- SLOTS
create table public.slots (
  id uuid default uuid_generate_v4() primary key,
  venue_id uuid references public.venues(id) on delete cascade not null,
  owner_id uuid references public.owner_profiles(id) on delete cascade,
  date date not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  price numeric not null,
  is_booked boolean default false not null,
  is_locked boolean default false not null,
  lock_expires timestamp with time zone,
  sport_type text,
  duration integer,
  max_players integer,
  booked_players integer default 0,
  status text default 'Available' check (status in ('Available', 'Booked', 'Blocked')),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
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

-- RLS Policies for venue_pricing (Owner writes)
create policy "Owners insert pricing" on public.venue_pricing for insert with check (exists (select 1 from public.venues where venues.id = venue_id and venues.owner_id in (select id from public.owner_profiles where user_id = auth.uid())));
create policy "Owners update pricing" on public.venue_pricing for update using (exists (select 1 from public.venues where venues.id = venue_id and venues.owner_id in (select id from public.owner_profiles where user_id = auth.uid())));
create policy "Owners delete pricing" on public.venue_pricing for delete using (exists (select 1 from public.venues where venues.id = venue_id and venues.owner_id in (select id from public.owner_profiles where user_id = auth.uid())));

-- RLS Policies for venue_images (Owner writes)
create policy "Owners insert images" on public.venue_images for insert with check (exists (select 1 from public.venues where venues.id = venue_id and venues.owner_id in (select id from public.owner_profiles where user_id = auth.uid())));
create policy "Owners update images" on public.venue_images for update using (exists (select 1 from public.venues where venues.id = venue_id and venues.owner_id in (select id from public.owner_profiles where user_id = auth.uid())));
create policy "Owners delete images" on public.venue_images for delete using (exists (select 1 from public.venues where venues.id = venue_id and venues.owner_id in (select id from public.owner_profiles where user_id = auth.uid())));

-- RLS Policies for slots (Owner Management & Customer Booking Update)
create policy "Owners insert slots" on public.slots for insert with check (owner_id in (select id from public.owner_profiles where user_id = auth.uid()));
create policy "Owners update slots" on public.slots for update using (owner_id in (select id from public.owner_profiles where user_id = auth.uid()));
create policy "Owners delete slots" on public.slots for delete using (owner_id in (select id from public.owner_profiles where user_id = auth.uid()));
create policy "Users update slots state" on public.slots for update using (auth.uid() is not null);

-- Trigger for auth.users to public.users (Handles new signups)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  assigned_role text;
begin
  if (new.email = 'jaminishannu9k@gmail.com') then
    assigned_role := 'ADMIN';
  else
    assigned_role := coalesce(new.raw_user_meta_data->>'role', 'CUSTOMER');
  end if;

  insert into public.users (id, email, role)
  values (new.id, new.email, assigned_role);
  
  if (assigned_role = 'OWNER') then
    insert into public.owner_profiles (user_id, full_name, business_name)
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'New Owner'), coalesce(new.raw_user_meta_data->>'full_name', 'New Owner') || 's Business');
  elsif (assigned_role = 'CUSTOMER') then
    insert into public.customer_profiles (user_id, full_name)
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'New Customer'));
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


- -   O W N E R   S E T T I N G S  
 c r e a t e   t a b l e   p u b l i c . o w n e r _ s e t t i n g s   (  
     i d   u u i d   d e f a u l t   u u i d _ g e n e r a t e _ v 4 ( )   p r i m a r y   k e y ,  
     o w n e r _ i d   u u i d   r e f e r e n c e s   p u b l i c . o w n e r _ p r o f i l e s ( i d )   o n   d e l e t e   c a s c a d e   u n i q u e   n o t   n u l l ,  
      
     - -   B u s i n e s s   P r o f i l e  
     b u s i n e s s _ l o g o _ u r l   t e x t ,  
     b u s i n e s s _ e m a i l   t e x t ,  
     b u s i n e s s _ p h o n e   t e x t ,  
     b u s i n e s s _ a d d r e s s   t e x t ,  
      
     - -   B o o k i n g   S e t t i n g s  
     a u t o _ a c c e p t _ b o o k i n g s   b o o l e a n   d e f a u l t   t r u e   n o t   n u l l ,  
     c a n c e l l a t i o n _ p o l i c y   t e x t   d e f a u l t   ' f l e x i b l e '   n o t   n u l l ,  
     b o o k i n g _ b u f f e r _ t i m e   t e x t   d e f a u l t   ' 0 '   n o t   n u l l ,  
      
     - -   B a n k   D e t a i l s   ( E n c r y p t e d   o r   s t r i c t   R L S   i n   p r o d u c t i o n )  
     b a n k _ a c c o u n t _ n a m e   t e x t ,  
     b a n k _ a c c o u n t _ n u m b e r   t e x t ,  
     b a n k _ i f s c   t e x t ,  
     b a n k _ u p i   t e x t ,  
      
     - -   N o t i f i c a t i o n s  
     n o t i f y _ b o o k i n g s   b o o l e a n   d e f a u l t   t r u e   n o t   n u l l ,  
     n o t i f y _ p a y m e n t s   b o o l e a n   d e f a u l t   t r u e   n o t   n u l l ,  
     n o t i f y _ e m a i l   b o o l e a n   d e f a u l t   t r u e   n o t   n u l l ,  
     n o t i f y _ s m s   b o o l e a n   d e f a u l t   f a l s e   n o t   n u l l ,  
      
     c r e a t e d _ a t   t i m e s t a m p   w i t h   t i m e   z o n e   d e f a u l t   t i m e z o n e ( ' u t c ' : : t e x t ,   n o w ( ) )   n o t   n u l l ,  
     u p d a t e d _ a t   t i m e s t a m p   w i t h   t i m e   z o n e   d e f a u l t   t i m e z o n e ( ' u t c ' : : t e x t ,   n o w ( ) )   n o t   n u l l  
 ) ;  
  
 - -   R L S   P o l i c i e s  
 a l t e r   t a b l e   p u b l i c . o w n e r _ s e t t i n g s   e n a b l e   r o w   l e v e l   s e c u r i t y ;  
  
 - -   O w n e r s   c a n   r e a d   t h e i r   o w n   s e t t i n g s  
 c r e a t e   p o l i c y   " O w n e r s   r e a d   o w n   s e t t i n g s "   o n   p u b l i c . o w n e r _ s e t t i n g s    
     f o r   s e l e c t   u s i n g   ( o w n e r _ i d   i n   ( s e l e c t   i d   f r o m   p u b l i c . o w n e r _ p r o f i l e s   w h e r e   u s e r _ i d   =   a u t h . u i d ( ) ) ) ;  
  
 - -   O w n e r s   c a n   i n s e r t   t h e i r   o w n   s e t t i n g s  
- -   O W N E R   S E T T I N G S  
 c r e a t e   t a b l e   p u b l i c . o w n e r _ s e t t i n g s   (  
     i d   u u i d   d e f a u l t   u u i d _ g e n e r a t e _ v 4 ( )   p r i m a r y   k e y ,  
     o w n e r _ i d   u u i d   r e f e r e n c e s   p u b l i c . o w n e r _ p r o f i l e s ( i d )   o n   d e l e t e   c a s c a d e   u n i q u e   n o t   n u l l ,  
      
     - -   B u s i n e s s   P r o f i l e  
     b u s i n e s s _ l o g o _ u r l   t e x t ,  
     b u s i n e s s _ e m a i l   t e x t ,  
     b u s i n e s s _ p h o n e   t e x t ,  
     b u s i n e s s _ a d d r e s s   t e x t ,  
      
     - -   B o o k i n g   S e t t i n g s  
     a u t o _ a c c e p t _ b o o k i n g s   b o o l e a n   d e f a u l t   t r u e   n o t   n u l l ,  
     c a n c e l l a t i o n _ p o l i c y   t e x t   d e f a u l t   ' f l e x i b l e '   n o t   n u l l ,  
     b o o k i n g _ b u f f e r _ t i m e   t e x t   d e f a u l t   ' 0 '   n o t   n u l l ,  
      
     - -   B a n k   D e t a i l s   ( E n c r y p t e d   o r   s t r i c t   R L S   i n   p r o d u c t i o n )  
     b a n k _ a c c o u n t _ n a m e   t e x t ,  
     b a n k _ a c c o u n t _ n u m b e r   t e x t ,  
     b a n k _ i f s c   t e x t ,  
     b a n k _ u p i   t e x t ,  
      
     - -   N o t i f i c a t i o n s  
     n o t i f y _ b o o k i n g s   b o o l e a n   d e f a u l t   t r u e   n o t   n u l l ,  
     n o t i f y _ p a y m e n t s   b o o l e a n   d e f a u l t   t r u e   n o t   n u l l ,  
     n o t i f y _ e m a i l   b o o l e a n   d e f a u l t   t r u e   n o t   n u l l ,  
     n o t i f y _ s m s   b o o l e a n   d e f a u l t   f a l s e   n o t   n u l l ,  
      
     c r e a t e d _ a t   t i m e s t a m p   w i t h   t i m e   z o n e   d e f a u l t   t i m e z o n e ( ' u t c ' : : t e x t ,   n o w ( ) )   n o t   n u l l ,  
     u p d a t e d _ a t   t i m e s t a m p   w i t h   t i m e   z o n e   d e f a u l t   t i m e z o n e ( ' u t c ' : : t e x t ,   n o w ( ) )   n o t   n u l l  
 ) ;  
  
 - -   R L S   P o l i c i e s  
 a l t e r   t a b l e   p u b l i c . o w n e r _ s e t t i n g s   e n a b l e   r o w   l e v e l   s e c u r i t y ;  
  
 - -   O w n e r s   c a n   r e a d   t h e i r   o w n   s e t t i n g s  
 c r e a t e   p o l i c y   " O w n e r s   r e a d   o w n   s e t t i n g s "   o n   p u b l i c . o w n e r _ s e t t i n g s    
     f o r   s e l e c t   u s i n g   ( o w n e r _ i d   i n   ( s e l e c t   i d   f r o m   p u b l i c . o w n e r _ p r o f i l e s   w h e r e   u s e r _ i d   =   a u t h . u i d ( ) ) ) ;  
  
 - -   O w n e r s   c a n   i n s e r t   t h e i r   o w n   s e t t i n g s  
 c r e a t e   p o l i c y   " O w n e r s   i n s e r t   o w n   s e t t i n g s "   o n   p u b l i c . o w n e r _ s e t t i n g s    
     f o r   i n s e r t   w i t h   c h e c k   ( o w n e r _ i d   i n   ( s e l e c t   i d   f r o m   p u b l i c . o w n e r _ p r o f i l e s   w h e r e   u s e r _ i d   =   a u t h . u i d ( ) ) ) ;  
  
 - -   O w n e r s   c a n   u p d a t e   t h e i r   o w n   s e t t i n g s  
 c r e a t e   p o l i c y   " O w n e r s   u p d a t e   o w n   s e t t i n g s "   o n   p u b l i c . o w n e r _ s e t t i n g s    
     f o r   u p d a t e   u s i n g   ( o w n e r _ i d   i n   ( s e l e c t   i d   f r o m   p u b l i c . o w n e r _ p r o f i l e s   w h e r e   u s e r _ i d   =   a u t h . u i d ( ) ) ) ;  

-- ADMIN SETTINGS
create table public.admin_settings (
  id uuid default uuid_generate_v4() primary key,
  platform_name text default 'TRUF GAMING' not null,
  commission_percentage numeric default 10 not null,
  support_email text default 'support@trufgaming.com' not null,
  maintenance_mode boolean default false not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ADMIN AUDIT LOGS
create table public.admin_audit_logs (
  id uuid default uuid_generate_v4() primary key,
  admin_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  reason text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.admin_settings enable row level security;
alter table public.admin_audit_logs enable row level security;

create policy "Allow public read admin settings" on public.admin_settings for select using (true);
create policy "Only admins can modify settings" on public.admin_settings for all to authenticated using (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'ADMIN')) with check (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'ADMIN'));
create policy "Only admins can manage audit logs" on public.admin_audit_logs for all to authenticated using (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'ADMIN')) with check (exists (select 1 from public.users where users.id = auth.uid() and users.role = 'ADMIN'));

insert into public.admin_settings (platform_name, commission_percentage, support_email, maintenance_mode)
select 'TRUF GAMING', 10, 'support@trufgaming.com', false
where not exists (select 1 from public.admin_settings);