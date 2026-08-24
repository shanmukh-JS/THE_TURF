-- Migration / Script to sync suspended owners with their venues and auto-trigger in PostgreSQL
-- 1. Immediately sync all existing venues for suspended owners:
UPDATE public.venues
SET is_disabled = true,
    verification_status = 'SUSPENDED'
WHERE owner_id IN (
    SELECT op.id 
    FROM public.owner_profiles op
    JOIN public.users u ON u.id = op.user_id
    WHERE u.is_suspended = true
);

-- 2. Create a PostgreSQL trigger to automatically disable/enable venues whenever user is_suspended changes
CREATE OR REPLACE FUNCTION public.sync_owner_suspension_to_venues()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_suspended = true AND (OLD.is_suspended IS DISTINCT FROM true) THEN
        UPDATE public.venues
        SET is_disabled = true,
            verification_status = 'SUSPENDED'
        WHERE owner_id IN (
            SELECT id FROM public.owner_profiles WHERE user_id = NEW.id
        );
    ELSIF NEW.is_suspended = false AND (OLD.is_suspended IS DISTINCT FROM false) THEN
        UPDATE public.venues
        SET is_disabled = false,
            verification_status = 'APPROVED'
        WHERE owner_id IN (
            SELECT id FROM public.owner_profiles WHERE user_id = NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_owner_suspension ON public.users;
CREATE TRIGGER trg_sync_owner_suspension
AFTER UPDATE OF is_suspended ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_owner_suspension_to_venues();
