import { defineConfig } from 'vitest/config'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

// Provide default dummy variables for tests if they are not defined to prevent validation failures
process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fake-supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'fake-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'fake-service-role-key'
process.env.EMAIL_ENCRYPTION_KEY =
  process.env.EMAIL_ENCRYPTION_KEY || 'fake-email-encryption-key-32-chars-long'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    alias: {
      '@': path.resolve(__dirname, './'),
    },
    exclude: ['**/node_modules/**', '**/dist/**', '**/playwright/**'],
    reporters: ['default', './__tests__/payment-validation/reporting/PaymentValidationReporter.ts'],
  },
})
