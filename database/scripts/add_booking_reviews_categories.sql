-- Add category columns to booking_reviews for detailed feedback
ALTER TABLE public.booking_reviews ADD COLUMN IF NOT EXISTS ground_quality INTEGER;
ALTER TABLE public.booking_reviews ADD COLUMN IF NOT EXISTS lighting INTEGER;
ALTER TABLE public.booking_reviews ADD COLUMN IF NOT EXISTS cleanliness INTEGER;
ALTER TABLE public.booking_reviews ADD COLUMN IF NOT EXISTS staff_behaviour INTEGER;
ALTER TABLE public.booking_reviews ADD COLUMN IF NOT EXISTS value_for_money INTEGER;
