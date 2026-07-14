-- Fix notifications RLS to allow any authenticated user to insert notifications
-- (needed so booking triggers from player sessions can notify owners)

-- Drop the old admin-only policy
drop policy if exists "Admins can insert notifications" on public.notifications;

-- Allow users to insert notifications only for themselves
create policy "Users can insert own notifications"
  on public.notifications for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Also allow system/service role inserts (for server-side actions)
create policy "Service role can insert notifications"
  on public.notifications for insert
  to service_role
  with check (true);
