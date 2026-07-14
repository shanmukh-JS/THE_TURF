-- Fix Supabase Storage Upload Permissions
-- Run this script in your Supabase SQL Editor

BEGIN;

-- 1. Drop old conflicting storage policies that might be blocking uploads
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Owner Upload" ON storage.objects;
DROP POLICY IF EXISTS "Owner Delete" ON storage.objects;
DROP POLICY IF EXISTS "Public Access Documents" ON storage.objects;
DROP POLICY IF EXISTS "Auth Users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Auth Users can update their documents" ON storage.objects;

-- 2. Create bulletproof policies allowing any logged-in user to upload to any bucket
CREATE POLICY "Global Public Read" 
ON storage.objects FOR SELECT 
USING (true);

CREATE POLICY "Global Auth Insert" 
ON storage.objects FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Global Auth Update" 
ON storage.objects FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Global Auth Delete" 
ON storage.objects FOR DELETE 
USING (auth.role() = 'authenticated');

COMMIT;
