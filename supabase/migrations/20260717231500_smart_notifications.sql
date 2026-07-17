-- SQL Migration: Smart Notification System Schema Extensions
-- Idempotently sets up Preferences, Analytics, Lifecycle Logs, and seeds rich event templates.

BEGIN;

-- 1. Create user_notification_preferences table
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL, -- e.g. 'bookings', 'xp', 'payments', etc.
    email_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    whatsapp_enabled BOOLEAN DEFAULT false,
    in_app_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, category)
);

-- Enable RLS for Preferences
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own preferences" ON public.user_notification_preferences;
CREATE POLICY "Users read own preferences" ON public.user_notification_preferences
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own preferences" ON public.user_notification_preferences;
CREATE POLICY "Users update own preferences" ON public.user_notification_preferences
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Add extended columns to notifications table
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'SYSTEM';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'MEDIUM' CHECK (priority IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'SILENT'));
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS icon VARCHAR(100);
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS color VARCHAR(100);
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_button BOOLEAN DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_text VARCHAR(100);
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Create notification_lifecycle_log table
CREATE TABLE IF NOT EXISTS public.notification_lifecycle_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL,
    state VARCHAR(50) NOT NULL CHECK (state IN ('CREATED', 'QUEUED', 'PROCESSING', 'SENT', 'DELIVERED', 'DISPLAYED', 'OPENED', 'CLICKED', 'ARCHIVED', 'EXPIRED', 'DELETED')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Lifecycle Log
ALTER TABLE public.notification_lifecycle_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins full access to lifecycle logs" ON public.notification_lifecycle_log;
CREATE POLICY "Admins full access to lifecycle logs" ON public.notification_lifecycle_log
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
    );

DROP POLICY IF EXISTS "Users read own lifecycle logs" ON public.notification_lifecycle_log;
CREATE POLICY "Users read own lifecycle logs" ON public.notification_lifecycle_log
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.notifications 
            WHERE notifications.id = notification_lifecycle_log.notification_id AND notifications.user_id = auth.uid()
        )
    );

-- 4. Create notification_analytics table
CREATE TABLE IF NOT EXISTS public.notification_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL CHECK (action IN ('SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'DISMISSED', 'EXPIRED')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Analytics
ALTER TABLE public.notification_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins full access to analytics" ON public.notification_analytics;
CREATE POLICY "Admins full access to analytics" ON public.notification_analytics
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
    );

-- 5. Create admin_campaigns / admin_broadcasts table
CREATE TABLE IF NOT EXISTS public.admin_broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    target_role VARCHAR(20) CHECK (target_role IN ('ALL', 'PLAYER', 'OWNER')),
    target_region VARCHAR(100),
    target_level INT,
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    scheduled_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Admin Broadcasts
ALTER TABLE public.admin_broadcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage broadcasts" ON public.admin_broadcasts;
CREATE POLICY "Admins manage broadcasts" ON public.admin_broadcasts
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
    );

DROP POLICY IF EXISTS "Everyone can read broadcasts" ON public.admin_broadcasts;
CREATE POLICY "Everyone can read broadcasts" ON public.admin_broadcasts
    FOR SELECT TO authenticated USING (true);

-- 6. Seed new rich templates in unified_notification_templates
INSERT INTO public.unified_notification_templates (event, subject, html_body)
VALUES 
('XP_EARNED', '🎉 +{{xpEarned}} XP Earned!', '<p>You earned {{xpEarned}} XP by completing your action. Only {{remainingXp}} XP left until Level {{nextLevel}}.</p>')
ON CONFLICT (event) DO UPDATE SET 
subject = EXCLUDED.subject, html_body = EXCLUDED.html_body;

INSERT INTO public.unified_notification_templates (event, subject, html_body)
VALUES 
('LEVEL_UP', 'Congratulations! You reached Level {{level}}! 🏆', '<p>Amazing progress! You have unlocked Level {{level}} and unlocked new rewards.</p>')
ON CONFLICT (event) DO UPDATE SET 
subject = EXCLUDED.subject, html_body = EXCLUDED.html_body;

INSERT INTO public.unified_notification_templates (event, subject, html_body)
VALUES 
('ACHIEVEMENT_UNLOCKED', 'Achievement Unlocked: {{achievementName}} 🏅', '<p>You unlocked {{achievementName}}! Keep up the great work.</p>')
ON CONFLICT (event) DO UPDATE SET 
subject = EXCLUDED.subject, html_body = EXCLUDED.html_body;

INSERT INTO public.unified_notification_templates (event, subject, html_body)
VALUES 
('STREAK_COMPLETED', '🔥 {{streakDays}}-Day Streak Logged!', '<p>Keep the streak alive! Book tomorrow to maintain your active streak.</p>')
ON CONFLICT (event) DO UPDATE SET 
subject = EXCLUDED.subject, html_body = EXCLUDED.html_body;

INSERT INTO public.unified_notification_templates (event, subject, html_body)
VALUES 
('BUSINESS_SUGGESTION', 'Smart suggestion: {{suggestionTitle}} 💡', '<p>{{suggestionDescription}}</p>')
ON CONFLICT (event) DO UPDATE SET 
subject = EXCLUDED.subject, html_body = EXCLUDED.html_body;

INSERT INTO public.unified_notification_templates (event, subject, html_body)
VALUES 
('LOW_RATING_ALERT', 'Low Rating Alert ⚠️', '<p>Your turf average rating has changed. Respond to reviews to build trust.</p>')
ON CONFLICT (event) DO UPDATE SET 
subject = EXCLUDED.subject, html_body = EXCLUDED.html_body;

COMMIT;
