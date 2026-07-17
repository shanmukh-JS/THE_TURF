-- ============================================================================
-- DATABASE HARDENING: Notification System Indexes & Constraints
-- ============================================================================
-- Applied after audit to improve query performance and data integrity.

BEGIN;

-- 1. Index on notifications.user_id for fast user-scoped lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON public.notifications(user_id);

-- 2. Index on notifications.category for filtered queries
CREATE INDEX IF NOT EXISTS idx_notifications_category
  ON public.notifications(category);

-- 3. Index on notifications.created_at for timeline ordering
CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON public.notifications(created_at DESC);

-- 4. Composite index for the most common query pattern: user + unread + time
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, is_read, created_at DESC);

-- 5. Index on notification_lifecycle_log.notification_id for lifecycle lookups
CREATE INDEX IF NOT EXISTS idx_lifecycle_log_notification_id
  ON public.notification_lifecycle_log(notification_id);

-- 6. Index on notification_analytics.notification_id for analytics joins
CREATE INDEX IF NOT EXISTS idx_analytics_notification_id
  ON public.notification_analytics(notification_id);

-- 7. Index on notification_events.user_id for user-scoped event queries
CREATE INDEX IF NOT EXISTS idx_notification_events_user_id
  ON public.notification_events(user_id);

-- 8. Index on notification_events.status for queue processing lookups
CREATE INDEX IF NOT EXISTS idx_notification_events_status
  ON public.notification_events(status);

-- 9. Index on user_notification_preferences for preference lookups
CREATE INDEX IF NOT EXISTS idx_user_notif_prefs_user_category
  ON public.user_notification_preferences(user_id, category);

-- 10. Index on notification_outbox for outbox processor polling
CREATE INDEX IF NOT EXISTS idx_notification_outbox_status_scheduled
  ON public.notification_outbox(status, scheduled_at);

COMMIT;
