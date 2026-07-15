-- ========================================================================================
-- IN-APP NOTIFICATIONS TABLE (Missing from previous run)
-- ========================================================================================

CREATE TABLE IF NOT EXISTS public.in_app_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own notifications
CREATE POLICY "Users can view their in-app notifications" 
ON public.in_app_notifications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their in-app notifications" 
ON public.in_app_notifications FOR UPDATE 
USING (auth.uid() = user_id);
