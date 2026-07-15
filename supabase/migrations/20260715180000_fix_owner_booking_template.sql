-- Fix the mismatched owner booking template name so it matches the event dispatched by the backend
UPDATE unified_notification_templates 
SET event = 'NEW_BOOKING' 
WHERE event = 'OWNER_NEW_BOOKING';
