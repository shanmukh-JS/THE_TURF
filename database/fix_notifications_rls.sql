-- Fix notifications RLS to allow any authenticated user to insert notifications
-- (needed so booking triggers from player sessions can notify owners)

-- Drop the old admin-only policy
drop policy if exists "Admins can insert notifications" on public.notifications;

-- Allow any authenticated user to insert a notification for any user_id
-- (the actual filtering of who can READ is still protected by the SELECT policy)
create policy "Authenticated users can insert notifications"
  on public.notifications for insert
  to authenticated
  with check (true);

-- Also allow system/service role inserts (for server-side actions)
-- This policy is needed if you're using server-side Supabase client
create policy "Service role can insert notifications"
  on public.notifications for insert
  to service_role
  with check (true);
