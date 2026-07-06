-- Add is_disabled column to venues table
ALTER TABLE public.venues
ADD COLUMN IF NOT EXISTS is_disabled boolean DEFAULT false NOT NULL;
