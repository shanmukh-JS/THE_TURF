-- Comprehensive Fix for Venue Creation RLS
-- Run this script in your Supabase SQL Editor

BEGIN;

-------------------------------------------------------------------
-- 1. CITIES & AREAS (Allow Authenticated Users to Insert)
-------------------------------------------------------------------
DROP POLICY IF EXISTS "Auth users can insert cities" ON public.cities;
CREATE POLICY "Auth users can insert cities" 
ON public.cities FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth users can insert areas" ON public.areas;
CREATE POLICY "Auth users can insert areas" 
ON public.areas FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-------------------------------------------------------------------
-- 2. VENUES (Allow Owners to Insert and Update their Venues)
-------------------------------------------------------------------
DROP POLICY IF EXISTS "Owners insert venues" ON public.venues;
CREATE POLICY "Owners insert venues" ON public.venues
FOR INSERT WITH CHECK (
  owner_id IN (SELECT id FROM public.owner_profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Owners update venues" ON public.venues;
CREATE POLICY "Owners update venues" ON public.venues
FOR UPDATE USING (
  owner_id IN (SELECT id FROM public.owner_profiles WHERE user_id = auth.uid())
);

-------------------------------------------------------------------
-- 3. VENUE PRICING (Allow Owners to Insert)
-------------------------------------------------------------------
DROP POLICY IF EXISTS "Owners insert pricing" ON public.venue_pricing;
CREATE POLICY "Owners insert pricing" ON public.venue_pricing
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.venues v 
    JOIN public.owner_profiles op ON v.owner_id = op.id
    WHERE v.id = venue_id AND op.user_id = auth.uid()
  )
);

-------------------------------------------------------------------
-- 4. VENUE IMAGES (Allow Owners to Insert)
-------------------------------------------------------------------
DROP POLICY IF EXISTS "Owners insert images" ON public.venue_images;
CREATE POLICY "Owners insert images" ON public.venue_images
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.venues v 
    JOIN public.owner_profiles op ON v.owner_id = op.id
    WHERE v.id = venue_id AND op.user_id = auth.uid()
  )
);

COMMIT;
