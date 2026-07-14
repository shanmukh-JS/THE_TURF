-- ==========================================
-- Email Notifications Schema
-- Run this in Supabase SQL Editor
-- ==========================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.email_notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    email text NOT NULL,
    notification_type text NOT NULL, -- e.g. 'BOOKING_CONFIRMATION', 'BOOKING_REMINDER'
    subject text NOT NULL,
    status text NOT NULL DEFAULT 'PENDING', -- PENDING, SENT, FAILED
    sent_at timestamp with time zone,
    retry_count integer DEFAULT 0,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Indexes for efficient querying by workers
CREATE INDEX IF NOT EXISTS idx_email_notifications_status ON public.email_notifications(status);
CREATE INDEX IF NOT EXISTS idx_email_notifications_booking_id ON public.email_notifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_created_at ON public.email_notifications(created_at);

-- RLS
ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own notifications
CREATE POLICY "Users can view their own email notifications"
ON public.email_notifications FOR SELECT
USING (auth.uid() = user_id);

-- System uses service_role to insert/update, which bypasses RLS automatically.

COMMIT;
