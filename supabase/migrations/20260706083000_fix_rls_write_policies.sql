-- RLS Policies for venue_pricing
CREATE POLICY "Owners insert pricing" ON public.venue_pricing
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.venues
    WHERE venues.id = venue_pricing.venue_id
    AND venues.owner_id IN (SELECT id FROM public.owner_profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Owners update pricing" ON public.venue_pricing
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.venues
    WHERE venues.id = venue_pricing.venue_id
    AND venues.owner_id IN (SELECT id FROM public.owner_profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Owners delete pricing" ON public.venue_pricing
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.venues
    WHERE venues.id = venue_pricing.venue_id
    AND venues.owner_id IN (SELECT id FROM public.owner_profiles WHERE user_id = auth.uid())
  )
);

-- RLS Policies for venue_images
CREATE POLICY "Owners insert images" ON public.venue_images
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.venues
    WHERE venues.id = venue_images.venue_id
    AND venues.owner_id IN (SELECT id FROM public.owner_profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Owners update images" ON public.venue_images
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.venues
    WHERE venues.id = venue_images.venue_id
    AND venues.owner_id IN (SELECT id FROM public.owner_profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Owners delete images" ON public.venue_images
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.venues
    WHERE venues.id = venue_images.venue_id
    AND venues.owner_id IN (SELECT id FROM public.owner_profiles WHERE user_id = auth.uid())
  )
);

-- RLS Policies for slots (Owner Management & Customer Booking Update)
CREATE POLICY "Owners insert slots" ON public.slots
FOR INSERT WITH CHECK (
  owner_id IN (SELECT id FROM public.owner_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Owners update slots" ON public.slots
FOR UPDATE USING (
  owner_id IN (SELECT id FROM public.owner_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Owners delete slots" ON public.slots
FOR DELETE USING (
  owner_id IN (SELECT id FROM public.owner_profiles WHERE user_id = auth.uid())
);

-- Allow customers/players to update slots (e.g. to Book them)
CREATE POLICY "Users update slots state" ON public.slots
FOR UPDATE USING (
  auth.uid() IS NOT NULL
);
