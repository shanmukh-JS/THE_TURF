// ============================================================================
// TRUF GAMING — Environment Validation
// Validates all required environment variables at startup.
// If any required variable is missing, the application will fail immediately
// with a clear error instead of crashing at runtime.
// ============================================================================

import { z } from 'zod'

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // Email encryption
  EMAIL_ENCRYPTION_KEY: z.string().min(16, 'EMAIL_ENCRYPTION_KEY must be at least 16 characters'),

  // Razorpay (optional in dev, required in production)
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  // Node environment
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
})

export type Env = z.infer<typeof envSchema>

let _validatedEnv: Env | null = null

/**
 * Validates and returns environment variables.
 * Throws with a clear message if required variables are missing.
 * Caches the result after the first successful validation.
 */
export function getEnv(): Env {
  if (_validatedEnv) return _validatedEnv

  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const missing = result.error.issues
      .map((issue) => `  ✗ ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')

    throw new Error(
      `\n╔══════════════════════════════════════════════════╗\n` +
        `║  TRUF GAMING — Environment Validation Failed     ║\n` +
        `╠══════════════════════════════════════════════════╣\n` +
        `║  The following environment variables are invalid: ║\n` +
        `╚══════════════════════════════════════════════════╝\n\n` +
        `${missing}\n\n` +
        `Fix these in your .env.local file and restart.\n`
    )
  }

  _validatedEnv = result.data
  return _validatedEnv
}

/** Check if running in production */
export function isProduction(): boolean {
  return getEnv().NODE_ENV === 'production'
}
