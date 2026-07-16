-- ========================================================================================
-- UNIFIED NOTIFICATION TEMPLATES (Fixing the collision)
-- ========================================================================================

-- 1. Create the unified_notification_templates Table
CREATE TABLE IF NOT EXISTS public.unified_notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event TEXT NOT NULL UNIQUE,
    subject TEXT NOT NULL,
    html_body TEXT NOT NULL, 
    enabled BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.unified_notification_templates ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DO $$ BEGIN
    CREATE POLICY "Anyone can read templates" 
    ON public.unified_notification_templates FOR SELECT 
    USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Super Admins can modify templates" 
    ON public.unified_notification_templates FOR ALL 
    USING (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN')
      )
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;
