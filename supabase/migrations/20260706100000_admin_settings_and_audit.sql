-- Create admin_settings table
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  platform_name text DEFAULT 'TRUF GAMING' NOT NULL,
  commission_percentage numeric DEFAULT 10 NOT NULL,
  support_email text DEFAULT 'support@trufgaming.com' NOT NULL,
  maintenance_mode boolean DEFAULT false NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create admin_audit_logs table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  reason text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Read Policies: Anyone authenticated can read settings
CREATE POLICY "Allow public read admin settings" ON public.admin_settings
FOR SELECT USING (true);

-- 2. Write Policies: Only ADMINs can modify settings
CREATE POLICY "Only admins can modify settings" ON public.admin_settings
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'ADMIN'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'ADMIN'
  )
);

-- 3. Audit logs access: Only ADMINs can read/write logs
CREATE POLICY "Only admins can manage audit logs" ON public.admin_audit_logs
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'ADMIN'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'ADMIN'
  )
);

-- Seed default settings row if empty
INSERT INTO public.admin_settings (platform_name, commission_percentage, support_email, maintenance_mode)
SELECT 'TRUF GAMING', 10, 'support@trufgaming.com', false
WHERE NOT EXISTS (SELECT 1 FROM public.admin_settings);
