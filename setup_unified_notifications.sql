-- ========================================================================================
-- UNIFIED NOTIFICATION SERVICE - DATABASE SCHEMA SETUP (PHASE 1)
-- ========================================================================================

-- 1. Create Enums for Channels and Statuses
DO $$ BEGIN
    CREATE TYPE public.notification_channel AS ENUM ('EMAIL', 'IN_APP', 'WHATSAPP', 'SMS', 'PUSH');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.notification_status AS ENUM ('QUEUED', 'PROCESSING', 'DELIVERED', 'FAILED', 'READ');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create the Central notification_events Table (The Source of Truth)
CREATE TABLE IF NOT EXISTS public.notification_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event TEXT NOT NULL, -- e.g., 'BOOKING_CONFIRMED', 'PAYMENT_FAILED'
    channel public.notification_channel NOT NULL,
    status public.notification_status NOT NULL DEFAULT 'QUEUED',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    provider TEXT, -- e.g., 'Nodemailer', 'Resend'
    provider_message_id TEXT,
    error_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ
);

-- 3. Create the notification_preferences Table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    email_enabled BOOLEAN NOT NULL DEFAULT true,
    in_app_enabled BOOLEAN NOT NULL DEFAULT true,
    whatsapp_enabled BOOLEAN NOT NULL DEFAULT false,
    sms_enabled BOOLEAN NOT NULL DEFAULT false,
    preferences JSONB NOT NULL DEFAULT '{}'::jsonb, -- Store granular event toggles here
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create the unified_notification_templates Table (Dynamic DB-stored Templates)
CREATE TABLE IF NOT EXISTS public.unified_notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event TEXT NOT NULL UNIQUE,
    subject TEXT NOT NULL,
    html_body TEXT NOT NULL, -- Store raw HTML layout here
    enabled BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Create the notification_settings Table (Global Toggles)
CREATE TABLE IF NOT EXISTS public.notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Create the reminder_logs Table (Idempotency Tracking)
CREATE TABLE IF NOT EXISTS public.reminder_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL, -- e.g., '10_MIN_BEFORE_PLAYER', '10_MIN_BEFORE_OWNER'
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(booking_id, reminder_type)
);

-- ========================================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================================================

-- Enable RLS on all tables
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unified_notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;

-- notification_events: Users can see their own notifications, Owners can see theirs, Admins can see all.
CREATE POLICY "Users can view their own notifications" 
ON public.notification_events FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Super Admins can view all notifications" 
ON public.notification_events FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN')
  )
);

-- notification_preferences: Users can view and update their own preferences
CREATE POLICY "Users can view their own preferences" 
ON public.notification_preferences FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" 
ON public.notification_preferences FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" 
ON public.notification_preferences FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- unified_notification_templates: Anyone can read, only Admins can modify
CREATE POLICY "Anyone can read templates" 
ON public.unified_notification_templates FOR SELECT 
USING (true);

CREATE POLICY "Super Admins can modify templates" 
ON public.unified_notification_templates FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN')
  )
);

-- notification_settings: Only Admins can modify, backend can read
CREATE POLICY "Super Admins can view settings" 
ON public.notification_settings FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN')
  )
);

CREATE POLICY "Super Admins can modify settings" 
ON public.notification_settings FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN')
  )
);

-- reminder_logs: Purely backend tracking, Admins can view
CREATE POLICY "Super Admins can view reminder logs" 
ON public.reminder_logs FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN')
  )
);

-- ========================================================================================
-- INITIAL SEED DATA
-- ========================================================================================

-- Seed initial admin settings
INSERT INTO public.notification_settings (setting_key, setting_value) 
VALUES 
('NOTIFICATIONS_ENABLED', 'true'::jsonb),
('REMINDERS_ENABLED', 'true'::jsonb),
('REMINDER_MINUTES', '10'::jsonb),
('MAX_RETRIES', '3'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;
