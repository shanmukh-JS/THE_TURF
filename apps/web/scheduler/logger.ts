// apps/web/scheduler/logger.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export async function logExecutionStart(jobName: string, scheduledFor?: Date) {
  const { data, error } = await supabase
    .from('scheduler_executions')
    .insert({
      job_name: jobName,
      scheduled_for: scheduledFor?.toISOString(),
      status: 'RUNNING',
    })
    .select('id')
    .single()

  if (error) {
    console.error(`Failed to log execution start for ${jobName}`, error)
    return null
  }
  return data.id
}

export async function logExecutionFinish(
  executionId: string,
  status: 'COMPLETED' | 'FAILED',
  jobsEnqueued: number,
  durationMs: number,
  errorMessage?: string
) {
  const { error } = await supabase
    .from('scheduler_executions')
    .update({
      status,
      finished_at: new Date().toISOString(),
      jobs_enqueued: jobsEnqueued,
      duration_ms: durationMs,
      error_message: errorMessage,
    })
    .eq('id', executionId)

  if (error) {
    console.error(`Failed to log execution finish for ${executionId}`, error)
  }
}
