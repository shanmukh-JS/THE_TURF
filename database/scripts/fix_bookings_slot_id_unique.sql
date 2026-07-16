-- Fix Bookings Slot ID Unique Constraint
-- Drop the strict UNIQUE constraint that prevents re-booking a cancelled slot
-- and replace it with a partial unique index targeting only active (non-cancelled) bookings.

-- 1. Drop the constraint
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_slot_id_key;
DROP INDEX IF EXISTS public.bookings_slot_id_key;

-- 2. Create the partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS bookings_active_slot_idx 
ON public.bookings (slot_id) 
WHERE status IS DISTINCT FROM 'CANCELLED';
