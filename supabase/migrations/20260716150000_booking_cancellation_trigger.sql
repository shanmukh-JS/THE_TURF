-- Migration: Automatic Booking Cancellation Trigger
-- Coordinates slot release and refund job queueing.

CREATE OR REPLACE FUNCTION public.handle_booking_cancellation()
RETURNS TRIGGER AS $$
BEGIN
    -- Only run if the booking status was changed to CANCELLED
    IF NEW.status = 'CANCELLED' AND OLD.status IS DISTINCT FROM 'CANCELLED' THEN
        -- 1. Free up the associated slot
        IF NEW.slot_id IS NOT NULL THEN
            UPDATE public.slots
            SET status = 'Available', is_booked = false, is_locked = false, lock_expires = null
            WHERE id = NEW.slot_id;
        END IF;

        -- 2. Queue the refund in notification_outbox if payment exists and advance was paid
        IF NEW.payment_id IS NOT NULL AND NEW.advance_paid > 0 THEN
            -- Check if refund is already initiated or completed to avoid duplicates
            IF NEW.payment_status IS DISTINCT FROM 'REFUND_INITIATED' AND NEW.payment_status IS DISTINCT FROM 'REFUND_COMPLETED' THEN
                -- Update the payment_status in-place
                NEW.payment_status := 'REFUND_INITIATED';

                -- Write refund job to notification_outbox
                INSERT INTO public.notification_outbox (
                    event_type,
                    payload,
                    idempotency_key,
                    priority,
                    status
                ) VALUES (
                    'payment.refund',
                    jsonb_build_object(
                        'bookingId', NEW.id,
                        'paymentId', NEW.payment_id,
                        'amount', NEW.advance_paid,
                        'customerId', NEW.customer_id,
                        'reason', 'Booking cancelled'
                    ),
                    'refund_' || NEW.id || '_' || extract(epoch from now())::text,
                    'HIGH',
                    'PENDING'
                );

                -- Log in payment_audit
                INSERT INTO public.payment_audit (
                    booking_id,
                    user_id,
                    razorpay_payment_id,
                    status,
                    amount,
                    metadata
                ) VALUES (
                    NEW.id,
                    NEW.customer_id,
                    NEW.payment_id,
                    'REFUND_INITIATED',
                    NEW.advance_paid,
                    jsonb_build_object('reason', 'Booking cancelled via trigger')
                );
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trg_handle_booking_cancellation ON public.bookings;

-- Create BEFORE UPDATE trigger on bookings
CREATE TRIGGER trg_handle_booking_cancellation
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.handle_booking_cancellation();
