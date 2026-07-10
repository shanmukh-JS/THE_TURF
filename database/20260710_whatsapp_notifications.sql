-- =================================================================================
-- ENTERPRISE NOTIFICATION & ENGAGEMENT ENGINE MIGRATION
-- Run this in your Supabase SQL Editor
-- =================================================================================

-- 1. Create Outbox Table
CREATE TABLE IF NOT EXISTS "public"."notification_outbox" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "event_type" text NOT NULL,
    "payload" jsonb NOT NULL,
    "idempotency_key" text UNIQUE NOT NULL,
    "priority" text NOT NULL CHECK (priority IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    "status" text DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSED', 'FAILED')),
    "scheduled_at" timestamp with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "processed_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_status_sched ON "public"."notification_outbox" ("status", "scheduled_at");

-- 2. Create Preferences Table
CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "user_id" uuid REFERENCES "public"."users"(id) ON DELETE CASCADE UNIQUE NOT NULL,
    "whatsapp_enabled" boolean DEFAULT true NOT NULL,
    "email_enabled" boolean DEFAULT true NOT NULL,
    "sms_enabled" boolean DEFAULT false NOT NULL,
    "inapp_enabled" boolean DEFAULT true NOT NULL,
    "login_alerts" boolean DEFAULT true NOT NULL,
    "booking_alerts" boolean DEFAULT true NOT NULL,
    "reminders" boolean DEFAULT true NOT NULL,
    "rating_requests" boolean DEFAULT true NOT NULL,
    "marketing" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Trigger to automatically create preferences when a user is created
CREATE OR REPLACE FUNCTION "public"."handle_user_preferences"()
RETURNS trigger AS $$
BEGIN
    INSERT INTO "public"."notification_preferences" (user_id)
    VALUES (new.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_created_preferences
    AFTER INSERT ON "public"."users"
    FOR EACH ROW EXECUTE PROCEDURE "public"."handle_user_preferences"();

-- Backfill preferences for existing users
INSERT INTO "public"."notification_preferences" (user_id)
SELECT id FROM "public"."users"
ON CONFLICT (user_id) DO NOTHING;

-- 3. Create Templates Table
CREATE TABLE IF NOT EXISTS "public"."notification_templates" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "name" text NOT NULL,
    "version" int DEFAULT 1 NOT NULL,
    "language" text DEFAULT 'en' NOT NULL,
    "meta_template_id" text,
    "variables" text[] NOT NULL,
    "status" text DEFAULT 'APPROVED' CHECK (status IN ('APPROVED', 'PENDING', 'DEPRECATED')),
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE("name", "version", "language")
);

-- 4. Create Notifications Table
CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "user_id" uuid REFERENCES "public"."users"(id) ON DELETE CASCADE NOT NULL,
    "booking_id" uuid REFERENCES "public"."bookings"(id) ON DELETE SET NULL,
    "type" text NOT NULL,
    "status" text NOT NULL CHECK (status IN ('QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED')),
    "recipient" text NOT NULL,
    "payload" jsonb NOT NULL,
    "provider" text,
    "retry_count" int DEFAULT 0 NOT NULL,
    "error_message" text,
    "sent_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON "public"."notifications" ("user_id");

-- 5. Create Notification Logs Table
CREATE TABLE IF NOT EXISTS "public"."notification_logs" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "notification_id" uuid REFERENCES "public"."notifications"(id) ON DELETE CASCADE,
    "action" text NOT NULL,
    "request_payload" jsonb,
    "response_payload" jsonb,
    "http_status" int,
    "execution_time_ms" int,
    "error_stack" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 6. Create Archive Table (matching Notifications)
CREATE TABLE IF NOT EXISTS "public"."notification_archive" (
    "id" uuid PRIMARY KEY,
    "user_id" uuid NOT NULL,
    "booking_id" uuid,
    "type" text NOT NULL,
    "status" text NOT NULL,
    "recipient" text NOT NULL,
    "payload" jsonb NOT NULL,
    "provider" text,
    "retry_count" int NOT NULL,
    "error_message" text,
    "sent_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "archived_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 7. Add Check-in fields to Bookings
ALTER TABLE "public"."bookings" ADD COLUMN IF NOT EXISTS "check_in_status" text DEFAULT 'NOT_CHECKED_IN' CHECK (check_in_status IN ('NOT_CHECKED_IN', 'CHECKED_IN', 'NO_SHOW'));
ALTER TABLE "public"."bookings" ADD COLUMN IF NOT EXISTS "checked_in_at" timestamp with time zone;

-- 8. Add Loyalty Points fields to Customer Profiles
ALTER TABLE "public"."customer_profiles" ADD COLUMN IF NOT EXISTS "xp" int DEFAULT 0 NOT NULL;
ALTER TABLE "public"."customer_profiles" ADD COLUMN IF NOT EXISTS "coins" int DEFAULT 0 NOT NULL;

-- 9. Create Venue Ratings & Sentiment Table
CREATE TABLE IF NOT EXISTS "public"."venue_ratings" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "booking_id" uuid REFERENCES "public"."bookings"(id) ON DELETE CASCADE UNIQUE NOT NULL,
    "user_id" uuid REFERENCES "public"."users"(id) ON DELETE CASCADE NOT NULL,
    "overall_rating" int NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
    "ground_quality" int NOT NULL CHECK (ground_quality BETWEEN 1 AND 5),
    "lighting" int NOT NULL CHECK (lighting BETWEEN 1 AND 5),
    "staff_behaviour" int NOT NULL CHECK (staff_behaviour BETWEEN 1 AND 5),
    "cleanliness" int NOT NULL CHECK (cleanliness BETWEEN 1 AND 5),
    "value_for_money" int NOT NULL CHECK (value_for_money BETWEEN 1 AND 5),
    "comments" text,
    "sentiment" text CHECK (sentiment IN ('POSITIVE', 'NEUTRAL', 'NEGATIVE')),
    "sentiment_breakdown" jsonb DEFAULT '{}'::jsonb NOT NULL, -- Topic classifications
    "ai_summary" text,
    "moderation_status" text DEFAULT 'APPROVED' CHECK (moderation_status IN ('APPROVED', 'FLAGGED', 'REJECTED')),
    "flagged_reason" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 10. Create Rating Replies Table
CREATE TABLE IF NOT EXISTS "public"."venue_rating_replies" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "rating_id" uuid REFERENCES "public"."venue_ratings"(id) ON DELETE CASCADE UNIQUE NOT NULL,
    "owner_id" uuid REFERENCES "public"."owner_profiles"(id) ON DELETE CASCADE NOT NULL,
    "reply_text" text NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 11. Create Secure Rating Tokens
CREATE TABLE IF NOT EXISTS "public"."rating_tokens" (
    "token" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "booking_id" uuid REFERENCES "public"."bookings"(id) ON DELETE CASCADE UNIQUE NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 12. Enable RLS on newly created tables
ALTER TABLE "public"."notification_outbox" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notification_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notification_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notification_archive" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."venue_ratings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."venue_rating_replies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rating_tokens" ENABLE ROW LEVEL SECURITY;

-- 13. Enable Select Policies for clients (where appropriate)
CREATE POLICY "Users read own preferences" ON "public"."notification_preferences" FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users update own preferences" ON "public"."notification_preferences" FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Public read approved ratings" ON "public"."venue_ratings" FOR SELECT USING (moderation_status = 'APPROVED');
CREATE POLICY "Public read rating replies" ON "public"."venue_rating_replies" FOR SELECT USING (true);

-- Services and background workers bypass RLS automatically via Service Role key.

-- 14. Seed Default Notification Templates
INSERT INTO "public"."notification_templates" (name, version, language, variables, status)
VALUES 
  ('auth_login_alert', 1, 'en', ARRAY['PlayerName', 'Time', 'Device', 'City'], 'APPROVED'),
  ('booking_confirm', 1, 'en', ARRAY['Player', 'Venue', 'Date', 'Time', 'Duration', 'BookingId', 'Amount', 'QrToken'], 'APPROVED'),
  ('booking_cancel', 1, 'en', ARRAY['Player', 'Venue', 'Amount', 'Reason'], 'APPROVED'),
  ('rating_request', 1, 'en', ARRAY['Venue', 'BookingId'], 'APPROVED'),
  ('match_reminder', 1, 'en', ARRAY['Player', 'Venue', 'Time', 'Address'], 'APPROVED')
ON CONFLICT ("name", "version", "language") DO NOTHING;
