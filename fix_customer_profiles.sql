-- Add image columns to customer_profiles if they don't exist
ALTER TABLE public.customer_profiles 
ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
ADD COLUMN IF NOT EXISTS banner_image_url TEXT;

-- Drop existing user policy if it exists (just in case)
DROP POLICY IF EXISTS "Users can manage their own customer profile" ON public.customer_profiles;

-- Create policy for users to manage their own profiles
CREATE POLICY "Users can manage their own customer profile" 
ON public.customer_profiles 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Create storage bucket for player profiles
insert into storage.buckets (id, name, public)
values ('player_profiles', 'player_profiles', true)
on conflict (id) do nothing;

create policy "Public Access player_profiles"
  on storage.objects for select
  using ( bucket_id = 'player_profiles' );

create policy "Auth Users can upload player_profiles"
  on storage.objects for insert
  with check ( bucket_id = 'player_profiles' and auth.role() = 'authenticated' );

create policy "Auth Users can update their player_profiles"
  on storage.objects for update
  using ( bucket_id = 'player_profiles' and auth.role() = 'authenticated' );

create policy "Auth Users can delete their player_profiles"
  on storage.objects for delete
  using ( bucket_id = 'player_profiles' and auth.role() = 'authenticated' );
