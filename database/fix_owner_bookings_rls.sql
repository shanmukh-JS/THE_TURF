-- FIX: Allow owners to read bookings for their venues
-- The existing RLS only lets CUSTOMERS read their own bookings.
-- Owners need to see bookings on their venues for Revenue, Bookings, and Dashboard pages.

-- Allow owners to SELECT bookings where venue_id belongs to one of their venues
CREATE POLICY "Owners read venue bookings" ON public.bookings
  FOR SELECT USING (
    venue_id IN (
      SELECT v.id FROM public.venues v
      WHERE v.owner_id IN (
        SELECT op.id FROM public.owner_profiles op
        WHERE op.user_id = auth.uid()
      )
    )
  );

-- Allow owners to read customer_profiles for displaying customer names on their bookings
CREATE POLICY "Owners read customer profiles for bookings" ON public.customer_profiles
  FOR SELECT USING (
    user_id IN (
      SELECT b.customer_id FROM public.bookings b
      WHERE b.venue_id IN (
        SELECT v.id FROM public.venues v
        WHERE v.owner_id IN (
          SELECT op.id FROM public.owner_profiles op
          WHERE op.user_id = auth.uid()
        )
      )
    )
  );
