-- ==============================================================================
-- ENTERPRISE VERIFICATION UPDATE
-- Please run this script in your Supabase SQL Editor
-- ==============================================================================

-- 1. Create a new storage bucket for Venue Documents (Govt IDs, Registration, etc.)
insert into storage.buckets (id, name, public)
values ('venue_documents', 'venue_documents', true)
on conflict (id) do nothing;

-- Set up storage policies for the documents bucket
create policy "Public Access Documents"
  on storage.objects for select
  using ( bucket_id = 'venue_documents' );

create policy "Auth Users can upload documents"
  on storage.objects for insert
  with check ( bucket_id = 'venue_documents' and auth.role() = 'authenticated' );

create policy "Auth Users can update their documents"
  on storage.objects for update
  using ( bucket_id = 'venue_documents' and auth.role() = 'authenticated' );

-- 2. Add verification checklist and admin fields to the 'venues' table
ALTER TABLE public.venues 
ADD COLUMN IF NOT EXISTS admin_notes text,
ADD COLUMN IF NOT EXISTS ai_verification_score int,
ADD COLUMN IF NOT EXISTS ai_verification_recommendation text,
ADD COLUMN IF NOT EXISTS identity_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS govt_id_uploaded boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS turf_images_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS location_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS operating_hours_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS documents_url text[] DEFAULT '{}'::text[];

-- NOTE: This also implicitly reloads the schema cache for the PostgREST API so the 'amenities' column error should disappear.
NOTIFY pgrst, 'reload schema';
