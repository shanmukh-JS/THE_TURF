-- Add is_suspended column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false NOT NULL;
