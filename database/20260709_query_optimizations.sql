-- ==============================================================================
-- TRUF GAMING — Phase 4: Query Optimizations & Indexing Strategy
-- Run this script in the Supabase SQL Editor.
-- ==============================================================================

-- 1. Slot Availability Search
CREATE INDEX IF NOT EXISTS idx_slots_search
ON public.slots (venue_id, date, status)
INCLUDE (price, start_time, end_time);

-- 2. Booking Lookup (User Dashboard)
CREATE INDEX IF NOT EXISTS idx_bookings_user
ON public.bookings(customer_id, created_at DESC);

-- 3. Owner Dashboard (Recent Bookings)
CREATE INDEX IF NOT EXISTS idx_bookings_owner
ON public.bookings(venue_id, created_at DESC);

-- 4. Upcoming Bookings Status lookup
CREATE INDEX IF NOT EXISTS idx_bookings_status_date
ON public.bookings(status, created_at);

-- 5. Venue Search (By City)
CREATE INDEX IF NOT EXISTS idx_venues_city_active
ON public.venues(city_id, verification_status);

-- Note: 'sport_type' might be in a separate features table or JSONB metadata column
-- If it exists as a top-level column, you'd index it like:
-- CREATE INDEX IF NOT EXISTS idx_venues_sport ON public.venues(sport_type, city_id);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
