-- Add new columns to public.venues
ALTER TABLE public.venues
ADD COLUMN city_name text,
ADD COLUMN contact_email text,
ADD COLUMN contact_phone text,
ADD COLUMN google_maps_link text,
ADD COLUMN operating_hours text,
ADD COLUMN sports_available text[],
ADD COLUMN facilities text[];

-- Create Storage Bucket for venue_images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('venue_images', 'venue_images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS for storage bucket
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'venue_images');

CREATE POLICY "Owner Upload" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'venue_images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Owner Delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'venue_images' AND auth.uid() IS NOT NULL);
