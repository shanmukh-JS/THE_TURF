-- Migration: scheduler_executions table
-- Tracks durable execution history of the Financial Scheduler jobs.

CREATE TABLE IF NOT EXISTS public.scheduler_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_name TEXT NOT NULL,
    scheduled_for TIMESTAMPTZ,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    status TEXT NOT NULL CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED')),
    jobs_enqueued INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER,
    trace_id TEXT,
    error_message TEXT
);

-- Index for querying history
CREATE INDEX idx_scheduler_executions_job_name ON public.scheduler_executions(job_name);
CREATE INDEX idx_scheduler_executions_started_at ON public.scheduler_executions(started_at DESC);

-- Example RLS setup (internal table, accessible only to service role)
ALTER TABLE public.scheduler_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scheduler_executions_service_role"
    ON public.scheduler_executions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
