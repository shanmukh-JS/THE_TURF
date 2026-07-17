-- Migration: System Reports & Complaints
-- Add table for storing user complaints about venues/owners.

CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
    complaint TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'RESOLVED')) DEFAULT 'PENDING',
    assigned_admin TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (they need to be authenticated, checked by RLS or API)
DROP POLICY IF EXISTS "Authenticated users can insert reports" ON public.reports;
CREATE POLICY "Authenticated users can insert reports" ON public.reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Admins can do anything
DROP POLICY IF EXISTS "Admins can manage reports" ON public.reports;
CREATE POLICY "Admins can manage reports" ON public.reports
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'ADMIN'
        )
    );

-- Create indexes for quick searches
CREATE INDEX IF NOT EXISTS idx_reports_venue_id ON public.reports(venue_id);
CREATE INDEX IF NOT EXISTS idx_reports_owner_id ON public.reports(owner_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
