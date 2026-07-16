-- Migration: Player Experience Rating & Completion Flow
-- Add booking columns, reviews table, and analytics tracking.

-- 1. Add lifecycle columns to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS review_status TEXT CHECK (review_status IN ('PENDING', 'SUBMITTED')) DEFAULT 'PENDING' NOT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS hidden_from_player BOOLEAN DEFAULT false NOT NULL;

-- 2. Create booking_reviews table
CREATE TABLE IF NOT EXISTS public.booking_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE UNIQUE NOT NULL,
    player_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    turf_id UUID REFERENCES public.venues(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    feedback TEXT NOT NULL CHECK (char_length(feedback) >= 10 AND char_length(feedback) <= 500),
    review_source TEXT DEFAULT 'player' NOT NULL,
    review_time INTEGER NOT NULL, -- Time taken to write in seconds
    booking_duration INTEGER NOT NULL, -- Booking duration in minutes
    review_sentiment TEXT CHECK (review_sentiment IN ('POSITIVE', 'NEUTRAL', 'NEGATIVE')),
    device_type TEXT NOT NULL, -- 'desktop' or 'mobile'
    edited BOOLEAN DEFAULT false NOT NULL,
    edited_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3. Enable RLS on booking_reviews
ALTER TABLE public.booking_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read reviews" ON public.booking_reviews;
CREATE POLICY "Public read reviews" ON public.booking_reviews
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Players can insert own reviews" ON public.booking_reviews;
CREATE POLICY "Players can insert own reviews" ON public.booking_reviews
    FOR INSERT WITH CHECK (auth.uid() = player_id);

DROP POLICY IF EXISTS "Players can update own reviews within 30 min" ON public.booking_reviews;
CREATE POLICY "Players can update own reviews within 30 min" ON public.booking_reviews
    FOR UPDATE USING (auth.uid() = player_id AND created_at > now() - INTERVAL '30 minutes');

-- Create index for quick searches
CREATE INDEX IF NOT EXISTS idx_booking_reviews_booking_id ON public.booking_reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_reviews_player_id ON public.booking_reviews(player_id);
CREATE INDEX IF NOT EXISTS idx_booking_reviews_turf_id ON public.booking_reviews(turf_id);
