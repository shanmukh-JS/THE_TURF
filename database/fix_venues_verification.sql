-- Add missing fields to venues
ALTER TABLE public.venues 
ADD COLUMN IF NOT EXISTS pincode text,
ADD COLUMN IF NOT EXISTS google_maps_link text,
ADD COLUMN IF NOT EXISTS size text,
ADD COLUMN IF NOT EXISTS max_players int,
ADD COLUMN IF NOT EXISTS surface text,
ADD COLUMN IF NOT EXISTS amenities jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS opening_time time without time zone,
ADD COLUMN IF NOT EXISTS closing_time time without time zone,
ADD COLUMN IF NOT EXISTS weekly_holidays jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS slot_duration int DEFAULT 60;

-- Add missing fields to venue_pricing
ALTER TABLE public.venue_pricing
ADD COLUMN IF NOT EXISTS weekend_price numeric,
ADD COLUMN IF NOT EXISTS peak_price numeric,
ADD COLUMN IF NOT EXISTS advance_limit int DEFAULT 15;
