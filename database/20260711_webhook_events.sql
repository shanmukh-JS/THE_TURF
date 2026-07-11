-- Migration: webhook_events table
-- Tracks incoming webhook events from payment providers (Razorpay) for idempotency and auditing.

CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL,
    event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    signature TEXT,
    payload JSONB NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ,
    processing_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (processing_status IN ('PENDING', 'PROCESSED', 'FAILED')),
    trace_id TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    
    -- Guarantee idempotency at the database level
    UNIQUE (provider, event_id)
);

-- Indices for performance and reconciliation
CREATE INDEX idx_webhook_events_provider_status ON public.webhook_events(provider, processing_status);
CREATE INDEX idx_webhook_events_received_at ON public.webhook_events(received_at DESC);

-- Example RLS setup (internal table, accessible only to service role)
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_events_service_role"
    ON public.webhook_events
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
