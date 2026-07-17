-- ==============================================================================
-- TRUF GAMING — Update rpc_book_slot
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.rpc_book_slot(
  p_slot_id uuid,
  p_venue_id uuid,
  p_customer_id uuid,
  p_total_amount numeric,
  p_advance_paid numeric,
  p_payment_id text DEFAULT NULL,
  p_status text DEFAULT 'CONFIRMED'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_slot RECORD;
  v_booking_id uuid;
BEGIN
  SELECT * INTO v_slot
  FROM public.slots
  WHERE id = p_slot_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Slot not found.';
  END IF;

  IF v_slot.is_booked THEN
    RAISE EXCEPTION 'This slot has already been booked.';
  END IF;

  IF v_slot.status != 'Available' THEN
    RAISE EXCEPTION 'This slot is not available for booking.';
  END IF;

  UPDATE public.slots
  SET is_booked = true,
      is_locked = false,
      lock_expires = NULL,
      status = 'Booked',
      updated_at = now()
  WHERE id = p_slot_id;

  INSERT INTO public.bookings (slot_id, venue_id, customer_id, total_amount, advance_paid, status, payment_id)
  VALUES (p_slot_id, p_venue_id, p_customer_id, p_total_amount, p_advance_paid, p_status, p_payment_id)
  RETURNING id INTO v_booking_id;

  INSERT INTO public.financial_ledger (reference_id, entry_type, debit, credit, balance_after, actor_id, description)
  VALUES (v_booking_id::text, 'BOOKING_PAYMENT', p_total_amount, 0, 0, p_customer_id, 'Booking payment received');

  RETURN v_booking_id;
END;
$$;
