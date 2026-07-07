-- DIAGNOSTIC: Check what data exists and why bookings might not show

-- 1. Check current logged-in user's role and ID
SELECT id, email, role FROM public.users ORDER BY created_at DESC LIMIT 10;

-- 2. Check owner profiles
SELECT id, user_id, full_name, business_name FROM public.owner_profiles;

-- 3. Check venues and their owners
SELECT v.id as venue_id, v.name as venue_name, v.owner_id, op.full_name as owner_name, op.user_id
FROM public.venues v
LEFT JOIN public.owner_profiles op ON op.id = v.owner_id;

-- 4. Check ALL bookings (run as admin/service role)
SELECT b.id, b.venue_id, b.customer_id, b.total_amount, b.status, b.slot_id
FROM public.bookings b;

-- 5. Check slots
SELECT id, venue_id, owner_id, date, start_time, end_time, price, is_booked, status
FROM public.slots
ORDER BY created_at DESC
LIMIT 20;

-- 6. Check customer profiles
SELECT id, user_id, full_name FROM public.customer_profiles;
