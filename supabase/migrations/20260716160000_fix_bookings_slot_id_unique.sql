-- Migration: Fix Bookings Slot ID Unique Constraint
-- Drop standard UNIQUE constraint and replace with partial unique index to allow re-booking cancelled slots.

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_slot_id_key;
DROP INDEX IF EXISTS public.bookings_slot_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_active_slot_idx 
ON public.bookings (slot_id) 
WHERE status IS DISTINCT FROM 'CANCELLED';
