-- Create the storage bucket for business logos
insert into storage.buckets (id, name, public)
values ('business_logos', 'business_logos', true)
on conflict (id) do nothing;

-- Set up storage policies for the bucket
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'business_logos' );

create policy "Auth Users can upload logos"
  on storage.objects for insert
  with check ( bucket_id = 'business_logos' and auth.role() = 'authenticated' );

create policy "Auth Users can update their logos"
  on storage.objects for update
  using ( bucket_id = 'business_logos' and auth.role() = 'authenticated' );
