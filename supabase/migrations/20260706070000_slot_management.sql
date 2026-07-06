-- Alter slots table to add management columns
ALTER TABLE public.slots
ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES public.owner_profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS sport_type text,
ADD COLUMN IF NOT EXISTS duration integer,
ADD COLUMN IF NOT EXISTS max_players integer,
ADD COLUMN IF NOT EXISTS booked_players integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'Available' CHECK (status IN ('Available', 'Booked', 'Blocked')),
ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- Update existing slots to have status corresponding to is_booked
UPDATE public.slots
SET status = CASE WHEN is_booked = true THEN 'Booked' ELSE 'Available' END
WHERE status IS NULL;
