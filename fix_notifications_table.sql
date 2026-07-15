ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'UNKNOWN';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'IN_APP';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata JSONB;
NOTIFY pgrst, 'reload schema';
