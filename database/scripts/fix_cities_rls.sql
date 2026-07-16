-- Fix RLS for Cities and Areas
-- Run this script in your Supabase SQL Editor

BEGIN;

-- Allow any authenticated user (owners and admins) to insert new cities
DROP POLICY IF EXISTS "Auth users can insert cities" ON public.cities;
CREATE POLICY "Auth users can insert cities" 
ON public.cities 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Allow any authenticated user (owners and admins) to insert new areas
DROP POLICY IF EXISTS "Auth users can insert areas" ON public.areas;
CREATE POLICY "Auth users can insert areas" 
ON public.areas 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

COMMIT;
