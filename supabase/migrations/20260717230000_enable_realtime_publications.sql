-- SQL Migration: Idempotently enable Supabase Realtime broadcast for key public tables.
-- Ensures that the tables are registered under the default 'supabase_realtime' publication.

BEGIN;

DO $$
BEGIN
    -- Idempotently check and alter publication to add tables
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'bookings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'slots'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.slots;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'venues'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.venues;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'refunds'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.refunds;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'reports'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'reviews'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'favorites'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.favorites;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'customer_profiles'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_profiles;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'owner_profiles'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.owner_profiles;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'financial_ledger_entries'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_ledger_entries;
    END IF;
END
$$;

COMMIT;
