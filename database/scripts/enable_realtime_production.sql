-- Enable Realtime for all critical production tables
-- This ensures that live updates reach the frontend immediately.

-- Step 1: Create the realtime publication if it doesn't exist
-- (Supabase usually has this by default, but just in case)
BEGIN;
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      CREATE PUBLICATION supabase_realtime;
    END IF;
  END
  $$;
COMMIT;

-- Step 2: Add critical tables to the realtime publication
-- We use a DO block to avoid errors if the table is already in the publication
DO $$
DECLARE
    t text;
    tables_to_add text[] := ARRAY[
        'notifications',
        'bookings',
        'venue_ratings',
        'booking_reviews',
        'reviews',
        'slots',
        'venues',
        'customer_profiles',
        'owner_profiles'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_add LOOP
        -- Check if table is already in publication
        IF NOT EXISTS (
            SELECT 1 
            FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND tablename = t
        ) THEN
            -- Only add if it exists in information_schema
            IF EXISTS (
                SELECT 1 
                FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = t
            ) THEN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', t);
            END IF;
        END IF;
    END LOOP;
END
$$;

-- Ensure REPLICA IDENTITY is set to FULL for tables where we need the OLD record payload in realtime updates
ALTER TABLE public.bookings REPLICA IDENTITY FULL;
ALTER TABLE public.slots REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
