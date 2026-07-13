-- Allow users to delete their own notifications
DROP POLICY IF EXISTS "Users can delete own notifications" ON "public"."notifications";

CREATE POLICY "Users can delete own notifications"
ON "public"."notifications" FOR DELETE
USING (auth.uid() = user_id);
