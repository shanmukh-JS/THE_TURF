-- =================================================================================
-- COMPREHENSIVE ROW LEVEL SECURITY (RLS) LOCKDOWN SCRIPT
-- Run this in your Supabase SQL Editor to secure your database!
-- =================================================================================

-- 1. Enable RLS on all critical tables
ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."venues" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."email_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."owner_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."customer_profiles" ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies (to prevent conflicts if run multiple times)
DROP POLICY IF EXISTS "Public can view venues" ON "public"."venues";
DROP POLICY IF EXISTS "Owners can manage their venues" ON "public"."venues";
DROP POLICY IF EXISTS "Users can view their own bookings" ON "public"."bookings";
DROP POLICY IF EXISTS "Owners can view bookings for their venues" ON "public"."bookings";
DROP POLICY IF EXISTS "Users can insert their own bookings" ON "public"."bookings";
DROP POLICY IF EXISTS "Users can read own notifications" ON "public"."notifications";
DROP POLICY IF EXISTS "Users can update own notifications" ON "public"."notifications";
DROP POLICY IF EXISTS "Users can view own customer profile" ON "public"."customer_profiles";
DROP POLICY IF EXISTS "Users can manage own customer profile" ON "public"."customer_profiles";
DROP POLICY IF EXISTS "Users can view own owner profile" ON "public"."owner_profiles";
DROP POLICY IF EXISTS "Users can manage own owner profile" ON "public"."owner_profiles";

-- ==================== VENUES ====================
-- Anyone can view venues
CREATE POLICY "Public can view venues" 
ON "public"."venues" FOR SELECT USING (true);

-- Only owners can insert/update their own venues
CREATE POLICY "Owners can manage their venues" 
ON "public"."venues" FOR ALL USING (
  owner_id IN (
    SELECT id FROM owner_profiles WHERE user_id = auth.uid()
  )
);

-- ==================== BOOKINGS ====================
-- Customers can view their own bookings
CREATE POLICY "Users can view their own bookings" 
ON "public"."bookings" FOR SELECT USING (customer_id = auth.uid());

-- Venue owners can view bookings for their venues
CREATE POLICY "Owners can view bookings for their venues" 
ON "public"."bookings" FOR SELECT USING (
  venue_id IN (
    SELECT id FROM venues WHERE owner_id IN (
      SELECT id FROM owner_profiles WHERE user_id = auth.uid()
    )
  )
);

-- NOTE: Booking insertion and updating should be done via the Service Role (Backend APIs)
-- We block clients from inserting/updating directly to prevent pricing manipulation.
-- The API route (/api/bookings/create) bypasses RLS securely.

-- ==================== NOTIFICATIONS & EMAIL LOGS ====================
-- Users can view their own notifications
CREATE POLICY "Users can read own notifications" 
ON "public"."notifications" FOR SELECT USING (user_id = auth.uid());

-- Users can mark their notifications as read
CREATE POLICY "Users can update own notifications" 
ON "public"."notifications" FOR UPDATE USING (user_id = auth.uid());

-- NOTE: Insertion is BLOCKED for clients. Notifications and emails MUST be created by the backend (Service Role)
-- to prevent users from spamming fake notifications to others.

-- ==================== PROFILES ====================
-- Customer Profiles
CREATE POLICY "Users can view own customer profile" 
ON "public"."customer_profiles" FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own customer profile" 
ON "public"."customer_profiles" FOR ALL USING (user_id = auth.uid());

-- Owner Profiles
CREATE POLICY "Users can view own owner profile" 
ON "public"."owner_profiles" FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own owner profile" 
ON "public"."owner_profiles" FOR ALL USING (user_id = auth.uid());

-- ==================== PUBLIC METADATA ====================
-- Anyone can view cities and areas
ALTER TABLE "public"."cities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."areas" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view cities" ON "public"."cities";
CREATE POLICY "Public can view cities" ON "public"."cities" FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public can view areas" ON "public"."areas";
CREATE POLICY "Public can view areas" ON "public"."areas" FOR SELECT USING (true);

-- Anyone can view venue pricing and images
ALTER TABLE "public"."venue_pricing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."venue_images" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view venue pricing" ON "public"."venue_pricing";
CREATE POLICY "Public can view venue pricing" ON "public"."venue_pricing" FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public can view venue images" ON "public"."venue_images";
CREATE POLICY "Public can view venue images" ON "public"."venue_images" FOR SELECT USING (true);
