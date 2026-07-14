-- ============================================================
-- MASTER FIX: Owner Bookings + Notifications RLS
-- Run this ONCE in Supabase SQL Editor
-- ============================================================

-- ── 1. OWNER can READ bookings on their venues ──────────────
DROP POLICY IF EXISTS "Owners read venue bookings" ON public.bookings;
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

-- ── 2. OWNER can UPDATE bookings (Accept / Cancel / Complete) ─
DROP POLICY IF EXISTS "Owners update venue bookings" ON public.bookings;
CREATE POLICY "Owners update venue bookings" ON public.bookings
  FOR UPDATE USING (
    venue_id IN (
      SELECT v.id FROM public.venues v
      WHERE v.owner_id IN (
        SELECT op.id FROM public.owner_profiles op
        WHERE op.user_id = auth.uid()
      )
    )
  );

-- ── 3. OWNER can read customer profiles for their bookings ───
DROP POLICY IF EXISTS "Owners read customer profiles for bookings" ON public.customer_profiles;
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

-- ── 4. NOTIFICATIONS: users can only insert for themselves ────
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;

CREATE POLICY "Users can insert own notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ── 5. REVIEWS: customers can insert reviews ─────────────────
DROP POLICY IF EXISTS "Customers can insert reviews" ON public.reviews;
CREATE POLICY "Customers can insert reviews" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can read reviews" ON public.reviews;
CREATE POLICY "Anyone can read reviews" ON public.reviews
  FOR SELECT USING (true);
