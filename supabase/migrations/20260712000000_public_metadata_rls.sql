-- Enable RLS and add public read access for cities, areas, pricing, and images
ALTER TABLE "public"."cities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."areas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."venue_pricing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."venue_images" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view cities" ON "public"."cities";
CREATE POLICY "Public can view cities" ON "public"."cities" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view areas" ON "public"."areas";
CREATE POLICY "Public can view areas" ON "public"."areas" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view venue pricing" ON "public"."venue_pricing";
CREATE POLICY "Public can view venue pricing" ON "public"."venue_pricing" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view venue images" ON "public"."venue_images";
CREATE POLICY "Public can view venue images" ON "public"."venue_images" FOR SELECT USING (true);
