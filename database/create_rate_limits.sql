-- Create rate limits table
CREATE TABLE IF NOT EXISTS public.rate_limits (
    key text PRIMARY KEY,
    tokens numeric NOT NULL,
    last_refill timestamp with time zone DEFAULT now() NOT NULL
);

-- Function for atomic rate limit checking and token consumption
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_key text,
    p_max_tokens numeric,
    p_refill_rate numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_now timestamp with time zone := now();
    v_elapsed numeric;
    v_tokens numeric;
    v_last_refill timestamp with time zone;
    v_allowed boolean;
    v_retry_after_ms numeric := 0;
BEGIN
    -- Try to lock the row
    SELECT tokens, last_refill INTO v_tokens, v_last_refill
    FROM public.rate_limits
    WHERE key = p_key
    FOR UPDATE;

    IF NOT FOUND THEN
        -- Insert new record
        v_tokens := p_max_tokens - 1;
        INSERT INTO public.rate_limits (key, tokens, last_refill)
        VALUES (p_key, v_tokens, v_now);
        RETURN json_build_object('allowed', true, 'remaining', floor(v_tokens), 'retryAfterMs', 0);
    END IF;

    -- Calculate elapsed time in seconds
    v_elapsed := extract(epoch from (v_now - v_last_refill));
    
    -- Refill tokens
    v_tokens := least(p_max_tokens, v_tokens + (v_elapsed * p_refill_rate));

    IF v_tokens < 1 THEN
        v_allowed := false;
        v_retry_after_ms := ceil((1 - v_tokens) / p_refill_rate) * 1000;
        UPDATE public.rate_limits SET tokens = v_tokens, last_refill = v_now WHERE key = p_key;
        RETURN json_build_object('allowed', false, 'remaining', 0, 'retryAfterMs', v_retry_after_ms);
    END IF;

    -- Consume 1 token
    v_tokens := v_tokens - 1;
    v_allowed := true;
    
    UPDATE public.rate_limits SET tokens = v_tokens, last_refill = v_now WHERE key = p_key;
    
    RETURN json_build_object('allowed', true, 'remaining', floor(v_tokens), 'retryAfterMs', 0);
END;
$$;
