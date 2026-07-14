-- ==============================================================================
-- TRUF GAMING — FINAL RLS & CONCURRENCY SECURITY AUDIT PATCH
-- ==============================================================================

-- ── 1. FIX CRITICAL ROLE ESCALATION ON public.users ───────────────────
DROP POLICY IF EXISTS "Admins manage users" ON public.users;
DROP POLICY IF EXISTS "Users read own profile" ON public.users;

-- Normal users can only SELECT their own user row
CREATE POLICY "Users read own profile" ON public.users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Only admins can INSERT/UPDATE/DELETE rows in public.users
CREATE POLICY "Admins manage users" ON public.users
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ── 2. REMOVE UNSAFE PUBLIC SLOT UPDATES (Prevents Price Tampering) ───
DROP POLICY IF EXISTS "Users update slots state" ON public.slots;


-- ── 3. PREVENT PARAMETER HIJACKING ON VENUES & PRICING ───────────────
DROP POLICY IF EXISTS "Owners update venues" ON public.venues;
CREATE POLICY "Owners update venues" ON public.venues
  FOR UPDATE 
  USING (owner_id IN (SELECT id FROM public.owner_profiles WHERE user_id = auth.uid()))
  WITH CHECK (owner_id IN (SELECT id FROM public.owner_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Owners update pricing" ON public.venue_pricing;
CREATE POLICY "Owners update pricing" ON public.venue_pricing
  FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.venues WHERE venues.id = venue_id AND venues.owner_id IN (SELECT id FROM public.owner_profiles WHERE user_id = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.venues WHERE venues.id = venue_id AND venues.owner_id IN (SELECT id FROM public.owner_profiles WHERE user_id = auth.uid())));


-- ── 4. SECURE STORAGE OBJECTS (Prevents hijacking owner documents) ──
DROP POLICY IF EXISTS "Auth Users can update their documents" ON storage.objects;
CREATE POLICY "Auth Users can update their documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING ( bucket_id = 'venue_documents' AND owner = auth.uid() )
  WITH CHECK ( bucket_id = 'venue_documents' AND owner = auth.uid() );

DROP POLICY IF EXISTS "Auth Users can delete their documents" ON storage.objects;
CREATE POLICY "Auth Users can delete their documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING ( bucket_id = 'venue_documents' AND owner = auth.uid() );


-- ── 5. CLEAN UP NESTED SUBQUERIES FOR ADMIN TABLES ───────────────────
DROP POLICY IF EXISTS "Admins manage email settings" ON public.email_settings;
CREATE POLICY "Admins manage email settings" ON public.email_settings 
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins manage temp registrations" ON public.temp_registrations;
CREATE POLICY "Admins manage temp registrations" ON public.temp_registrations 
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins manage otp verification" ON public.otp_verification;
CREATE POLICY "Admins manage otp verification" ON public.otp_verification 
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins manage email logs" ON public.email_logs;
CREATE POLICY "Admins manage email logs" ON public.email_logs 
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
