// ============================================================================
// TRUF GAMING — Health Check Endpoint
// Validates database connectivity and storage availability.
// Used by load balancers, CI/CD, and monitoring dashboards.
// ============================================================================

import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const checks: Record<
    string,
    { status: 'healthy' | 'unhealthy'; latencyMs: number; error?: string }
  > = {}

  // 1. Database health
  const dbStart = Date.now()
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('users').select('id', { count: 'exact', head: true })
    checks.database = {
      status: error ? 'unhealthy' : 'healthy',
      latencyMs: Date.now() - dbStart,
      ...(error && { error: error.message }),
    }
  } catch (err) {
    checks.database = {
      status: 'unhealthy',
      latencyMs: Date.now() - dbStart,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }

  // 2. Storage health
  const storageStart = Date.now()
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.storage.listBuckets()
    checks.storage = {
      status: error ? 'unhealthy' : 'healthy',
      latencyMs: Date.now() - storageStart,
      ...(error && { error: error.message }),
    }
  } catch (err) {
    checks.storage = {
      status: 'unhealthy',
      latencyMs: Date.now() - storageStart,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }

  const allHealthy = Object.values(checks).every((c) => c.status === 'healthy')

  return NextResponse.json(
    {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      uptime: process.uptime(),
      checks,
    },
    { status: allHealthy ? 200 : 503 }
  )
}
