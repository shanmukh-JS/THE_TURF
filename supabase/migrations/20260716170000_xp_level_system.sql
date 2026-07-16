-- Migration: Player XP & Level Progression System
-- Add columns, audit logs, and trigger for automatic XP allocation/deduction.

-- 1. Add XP and Level columns to customer_profiles
ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0 NOT NULL CHECK (xp >= 0);
ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1 NOT NULL CHECK (level >= 1);
ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS last_celebrated_level INTEGER DEFAULT 1 NOT NULL CHECK (last_celebrated_level >= 1);

-- 2. Create xp_audit_logs table
CREATE TABLE IF NOT EXISTS public.xp_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN ('BOOKED', 'CANCELLED')),
    xp_before INTEGER NOT NULL,
    xp_change INTEGER NOT NULL,
    xp_after INTEGER NOT NULL,
    level_before INTEGER NOT NULL,
    level_after INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.xp_audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can read own XP logs" ON public.xp_audit_logs;
DROP POLICY IF EXISTS "Service role full access to XP logs" ON public.xp_audit_logs;

-- Select policy: users can read their own XP logs
CREATE POLICY "Users can read own XP logs" ON public.xp_audit_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "Service role full access to XP logs" ON public.xp_audit_logs
    FOR ALL USING (true) WITH CHECK (true);

-- 3. Database trigger function for atomic XP management
CREATE OR REPLACE FUNCTION public.handle_booking_xp_progression()
RETURNS TRIGGER AS $$
DECLARE
    v_xp_award INTEGER;
    v_xp_before INTEGER;
    v_xp_after INTEGER;
    v_level_before INTEGER;
    v_level_after INTEGER;
    v_profile_exists BOOLEAN;
BEGIN
    -- Configure XP parameters (constant award of 250 XP per booking)
    v_xp_award := 250;

    -- Check if customer profile exists
    SELECT EXISTS(SELECT 1 FROM public.customer_profiles WHERE user_id = NEW.customer_id) INTO v_profile_exists;
    IF NOT v_profile_exists THEN
        -- If profile doesn't exist, create a default one
        INSERT INTO public.customer_profiles (user_id, full_name, xp, level, last_celebrated_level)
        VALUES (NEW.customer_id, 'Player', 0, 1, 1);
    END IF;

    -- Load current XP and Level before change
    SELECT xp, level INTO v_xp_before, v_level_before
    FROM public.customer_profiles
    WHERE user_id = NEW.customer_id;

    -- A. Successful Booking (AWARD XP)
    IF NEW.status = 'CONFIRMED' AND (OLD.status IS DISTINCT FROM 'CONFIRMED' OR TG_OP = 'INSERT') THEN
        -- Idempotency Check: check if already awarded XP for this booking
        IF NOT EXISTS (
            SELECT 1 FROM public.xp_audit_logs 
            WHERE user_id = NEW.customer_id AND booking_id = NEW.id AND action = 'BOOKED'
        ) THEN
            -- Calculate new XP and Level
            v_xp_after := v_xp_before + v_xp_award;
            v_level_after := LEAST(50, GREATEST(1, 1 + FLOOR(v_xp_after / 1000)));

            -- Update customer profile
            UPDATE public.customer_profiles
            SET xp = v_xp_after,
                level = v_level_after
            WHERE user_id = NEW.customer_id;

            -- Log in audit table
            INSERT INTO public.xp_audit_logs (
                user_id, booking_id, action, xp_before, xp_change, xp_after, level_before, level_after
            ) VALUES (
                NEW.customer_id, NEW.id, 'BOOKED', v_xp_before, v_xp_award, v_xp_after, v_level_before, v_level_after
            );
        END IF;

    -- B. Booking Cancellation (DEDUCT XP)
    ELSIF NEW.status = 'CANCELLED' AND OLD.status IS DISTINCT FROM 'CANCELLED' THEN
        -- Idempotency Check: check if already deducted XP for this booking, 
        -- AND ensure we only deduct if we previously awarded XP (i.e. 'BOOKED' log exists)
        IF EXISTS (
            SELECT 1 FROM public.xp_audit_logs 
            WHERE user_id = NEW.customer_id AND booking_id = NEW.id AND action = 'BOOKED'
        ) AND NOT EXISTS (
            SELECT 1 FROM public.xp_audit_logs 
            WHERE user_id = NEW.customer_id AND booking_id = NEW.id AND action = 'CANCELLED'
        ) THEN
            -- Calculate new XP (prevent negative) and Level (prevent below 1)
            v_xp_after := GREATEST(0, v_xp_before - v_xp_award);
            v_level_after := LEAST(50, GREATEST(1, 1 + FLOOR(v_xp_after / 1000)));

            -- Update customer profile
            UPDATE public.customer_profiles
            SET xp = v_xp_after,
                level = v_level_after
            WHERE user_id = NEW.customer_id;

            -- Log in audit table
            INSERT INTO public.xp_audit_logs (
                user_id, booking_id, action, xp_before, xp_change, xp_after, level_before, level_after
            ) VALUES (
                NEW.customer_id, NEW.id, 'CANCELLED', v_xp_before, -v_xp_award, v_xp_after, v_level_before, v_level_after
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trg_booking_xp_progression ON public.bookings;

-- Create AFTER INSERT OR UPDATE trigger on bookings
CREATE TRIGGER trg_booking_xp_progression
AFTER INSERT OR UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.handle_booking_xp_progression();
