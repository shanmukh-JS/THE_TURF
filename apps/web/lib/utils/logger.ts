// ============================================================================
// TRUF GAMING — Structured Logger
// Enterprise-grade audit/security/system logging with rich metadata.
// ============================================================================

import { createAdminClient } from '@/lib/supabase/admin'
import type { AuditModule } from '@/types/models'

export interface LogEntry {
  actor_id: string
  module: AuditModule
  action: string
  target_id?: string | null
  old_value?: Record<string, unknown> | null
  new_value?: Record<string, unknown> | null
  ip_address?: string | null
  user_agent?: string | null
  request_id?: string | null
}

/**
 * Writes a structured audit log entry to the database.
 * Non-blocking — failures are logged to console but never throw.
 */
export async function writeAuditLog(entry: LogEntry): Promise<void> {
  try {
    const supabase = createAdminClient()
    await supabase.from('audit_logs').insert({
      ...entry,
      created_at: new Date().toISOString(),
    })
  } catch (err) {
    // Logging should never break the main flow
    console.error('[AuditLog] Failed to write log:', err)
  }
}

/**
 * Extract IP and User-Agent from a NextRequest for logging.
 */
export function extractRequestMeta(req: Request): { ip: string; userAgent: string } {
  const ip =
    (req.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  const userAgent = req.headers.get('user-agent') || 'Unknown'
  return { ip, userAgent }
}

/**
 * Generate a unique request ID for tracing.
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Error extraction utility
 */
export function extractErrorMsg(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return JSON.stringify(error)
}

/**
 * Standardized system logger for non-audit events, completely replacing console.log.
 * In a real environment, this might connect to Datadog/Winston.
 */
export const logger = {
  info: (message: string, meta?: unknown) => {
    // We stringify JSON meta to avoid multi-line object spread in raw console output
    const timestamp = new Date().toISOString()
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : ''
    process.stdout.write(
      `{"time":"${timestamp}","level":"INFO","message":"${message}"${metaStr}}\n`
    )
  },
  warn: (message: string, meta?: unknown) => {
    const timestamp = new Date().toISOString()
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : ''
    process.stdout.write(
      `{"time":"${timestamp}","level":"WARN","message":"${message}"${metaStr}}\n`
    )
  },
  error: (message: string, meta?: unknown) => {
    const timestamp = new Date().toISOString()
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : ''
    process.stderr.write(
      `{"time":"${timestamp}","level":"ERROR","message":"${message}"${metaStr}}\n`
    )
  },
}
