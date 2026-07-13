-- Add max_players_per_booking to owner_settings
ALTER TABLE "public"."owner_settings"
ADD COLUMN IF NOT EXISTS "max_players_per_booking" integer DEFAULT 12 NOT NULL;
