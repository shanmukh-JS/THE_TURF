-- Migration: Dynamic Commission and Max Payout Limit Enforcement
-- Modifies: create_owner_payable_v1, create_payout_transfers_v1
-- Depends on: 20260714_payout_engine.sql / 20260715120000_consolidated_historical_patches.sql

BEGIN;

-- 1. Modify create_owner_payable_v1 to use admin_settings.commission_percentage
CREATE OR REPLACE FUNCTION create_owner_payable_v1(
    p_booking_id UUID,
    p_owner_id UUID,
    p_total_booking_amount BIGINT,
    p_executed_by UUID
) RETURNS UUID AS $$
DECLARE
    v_commission_amount BIGINT;
    v_owner_amount BIGINT;
    v_payable_id UUID;
    v_journal_id UUID;
    v_lock_key BIGINT;
    v_platform_commission_pct NUMERIC;
BEGIN
    -- 1. Preconditions & Lock
    v_lock_key := ('x'||substr(md5(p_booking_id::text),1,16))::bit(64)::bigint;
    IF NOT pg_try_advisory_xact_lock(v_lock_key) THEN
        RAISE EXCEPTION 'Concurrent payable creation for booking %', p_booking_id;
    END IF;

    IF EXISTS (SELECT 1 FROM owner_payables WHERE booking_id = p_booking_id) THEN
        RAISE EXCEPTION 'Payable already exists for booking %', p_booking_id;
    END IF;

    -- 2. Fetch commission percentage from admin_settings
    SELECT commission_percentage INTO v_platform_commission_pct FROM public.admin_settings LIMIT 1;
    IF v_platform_commission_pct IS NULL THEN
        v_platform_commission_pct := 10.0; -- Default fallback
    END IF;

    -- 3. Calculations
    v_commission_amount := ROUND((p_total_booking_amount * (v_platform_commission_pct / 100.0)))::BIGINT;
    v_owner_amount := p_total_booking_amount - v_commission_amount;

    -- 4. Accounting (Mock)
    v_journal_id := gen_random_uuid(); 

    -- 5. Persist Domain State
    INSERT INTO owner_payables (owner_id, booking_id, journal_id, amount)
    VALUES (p_owner_id, p_booking_id, v_journal_id, v_owner_amount)
    RETURNING id INTO v_payable_id;

    -- 6. Audit
    INSERT INTO payout_audit_logs (entity_type, entity_id, action, new_state, executed_by, journal_id)
    VALUES ('OWNER_PAYABLE', v_payable_id, 'CREATED', jsonb_build_object('amount', v_owner_amount, 'booking_id', p_booking_id, 'commission_pct_applied', v_platform_commission_pct), p_executed_by, v_journal_id);

    RETURN v_payable_id;
END;
$$ LANGUAGE plpgsql;


-- 2. Modify create_payout_transfers_v1 to enforce admin_settings.max_payout_limit
CREATE OR REPLACE FUNCTION create_payout_transfers_v1(
    p_batch_id UUID,
    p_provider VARCHAR(50),
    p_executed_by UUID
) RETURNS INTEGER AS $$
DECLARE
    v_lock_key BIGINT;
    v_transfers_created INTEGER := 0;
    v_max_payout_limit BIGINT;
    v_total_batch_amount BIGINT := 0;
    r RECORD;
BEGIN
    v_lock_key := ('x'||substr(md5(p_batch_id::text),1,16))::bit(64)::bigint;
    IF NOT pg_try_advisory_xact_lock(v_lock_key) THEN
        RAISE EXCEPTION 'Concurrent transfer creation %', p_batch_id;
    END IF;

    -- Fetch max_payout_limit from admin_settings
    SELECT max_payout_limit INTO v_max_payout_limit FROM public.admin_settings LIMIT 1;

    -- Transition batch to PROCESSING
    PERFORM transition_payout_batch_state_v1(p_batch_id, 'PROCESSING', p_executed_by);

    -- Calculate total proposed batch sum before generating transfers
    SELECT SUM(amount) INTO v_total_batch_amount
    FROM payout_batch_items pbi
    JOIN owner_payables op ON pbi.payable_id = op.id
    WHERE pbi.batch_id = p_batch_id;

    -- Enforce Max Payout Limit
    IF v_max_payout_limit IS NOT NULL AND v_total_batch_amount > v_max_payout_limit THEN
        RAISE EXCEPTION 'Batch exceeds max payout limit. Batch sum: %, Max limit: %', v_total_batch_amount, v_max_payout_limit;
    END IF;

    WITH new_transfers AS (
        INSERT INTO payout_transfers (batch_id, owner_id, amount, provider)
        SELECT p_batch_id, owner_id, SUM(amount), p_provider
        FROM payout_batch_items pbi
        JOIN owner_payables op ON pbi.payable_id = op.id
        WHERE pbi.batch_id = p_batch_id
        GROUP BY owner_id
        RETURNING id, owner_id, amount
    )
    INSERT INTO payout_transfer_items (transfer_id, payable_id)
    SELECT nt.id, pbi.payable_id
    FROM new_transfers nt
    JOIN payout_batch_items pbi ON pbi.batch_id = p_batch_id
    JOIN owner_payables op ON pbi.payable_id = op.id AND op.owner_id = nt.owner_id;
    
    -- Explicit validation: Ensure grouped payables belong to batch and owner
    IF EXISTS (
        SELECT 1 
        FROM payout_transfer_items pti
        JOIN payout_transfers t ON pti.transfer_id = t.id
        JOIN owner_payables op ON pti.payable_id = op.id
        WHERE t.batch_id = p_batch_id AND (op.owner_id != t.owner_id OR op.status != 'BATCHED')
    ) THEN
        RAISE EXCEPTION 'Transfer item validation failed. Payable owner mismatch or state invalid.';
    END IF;

    -- Transition all related payables to PROCESSING
    FOR r IN (SELECT payable_id FROM payout_batch_items WHERE batch_id = p_batch_id) LOOP
        PERFORM transition_owner_payable_state_v1(r.payable_id, 'PROCESSING', p_executed_by);
    END LOOP;

    GET DIAGNOSTICS v_transfers_created = ROW_COUNT;
    RETURN v_transfers_created;
END;
$$ LANGUAGE plpgsql;

COMMIT;
