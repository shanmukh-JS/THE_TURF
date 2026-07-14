// scripts/security_audit.ts
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from apps/web/.env.local
const scriptDir = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1')
dotenv.config({ path: path.resolve(scriptDir, '..', 'apps', 'web', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Error: Supabase credentials missing in apps/web/.env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

// Whitelist of authorized administrators/owners
const ADMIN_EMAIL_WHITELIST = [
  '3shanmukhkadali@gmail.com',
  'admin@turfgaming.com',
  'owner@turfgaming.com',
]

async function runSecurityAudit() {
  console.log('🔍 Starting Turf Gaming Security & Access Control Audit...\n')

  try {
    // 1. Audit public.users for unauthorized roles
    console.log('--- Checking public.users for unauthorized elevated roles ---')
    const { data: dbUsers, error: dbError } = await supabase
      .from('users')
      .select('id, email, role, created_at')
      .in('role', ['ADMIN', 'OWNER'])

    if (dbError) {
      console.error('❌ Error fetching public users:', dbError.message)
    } else {
      const violations = dbUsers.filter((u: any) => !ADMIN_EMAIL_WHITELIST.includes(u.email))
      if (violations.length > 0) {
        console.warn(`⚠️ Warning: Found ${violations.length} unauthorized elevated users:`)
        console.table(violations)
      } else {
        console.log('✅ No unauthorized ADMIN/OWNER accounts found in public.users.')
      }
    }
    console.log('')

    // 2. Audit auth.users via Supabase Auth Admin API
    console.log('--- Checking auth.users metadata via Supabase Admin API ---')
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) {
      console.error('❌ Error listing auth users:', authError.message)
    } else {
      const suspiciousAuth = authUsers?.users.filter((user: any) => {
        const role = user.app_metadata?.role
        const hasElevated = ['ADMIN', 'OWNER'].includes(role)
        return hasElevated && !ADMIN_EMAIL_WHITELIST.includes(user.email)
      })

      if (suspiciousAuth && suspiciousAuth.length > 0) {
        console.warn(`⚠️ Warning: Found ${suspiciousAuth.length} suspicious auth metadata roles:`)
        console.table(
          suspiciousAuth.map((u: any) => ({
            id: u.id,
            email: u.email,
            role: u.app_metadata.role,
            created_at: u.created_at,
          }))
        )
      } else {
        console.log('✅ No unauthorized ADMIN/OWNER accounts found in auth.users app_metadata.')
      }
    }
    console.log('')

    // 3. Check historical temp_registrations table for pre-patch records
    console.log('--- Checking temp_registrations for accounts created before patch ---')
    const patchTime = '2026-07-14T17:39:54.000Z'
    const { data: tempRegs, error: tempError } = await supabase
      .from('temp_registrations')
      .select('id, email, name, role, created_at')
      .lt('created_at', patchTime)

    if (tempError) {
      console.error('❌ Error reading temp_registrations:', tempError.message)
    } else if (tempRegs && tempRegs.length > 0) {
      console.warn(
        `⚠️ Warning: Found ${tempRegs.length} users registered before the password/role escalation security patch. These passwords must be reset.`
      )
      console.table(tempRegs)
    } else {
      console.log('✅ No pre-patch temporary registrations found.')
    }
    console.log('\n=============================================================')
    console.log('🛡️ SECURITY REMEDIATION GUIDE')
    console.log('=============================================================')
    console.log('\n1. INVALIDATE ALL ACTIVE SESSIONS:')
    console.log('   Run this SQL in your Supabase Editor to force logout all users:')
    console.log('   👉 DELETE FROM auth.sessions;')
    console.log('\n2. FORCE PASSWORD RESET FOR PRE-PATCH REGISTRATIONS:')
    console.log(
      '   Run this SQL to identify and force reset users who registered under the old symmetric password scheme:'
    )
    console.log('   👉 -- If using custom user metadata reset flag:')
    console.log('      UPDATE auth.users')
    console.log(
      '      SET raw_user_meta_data = raw_user_meta_data || \'{"must_change_password": true}\'::jsonb'
    )
    console.log(
      "      WHERE email IN (SELECT email FROM public.temp_registrations WHERE created_at < '" +
        patchTime +
        "');"
    )
    console.log('\n3. ROTATE SENSITIVE CREDENTIALS:')
    console.log('   - Log into the Supabase Dashboard -> Project Settings -> API')
    console.log('   - Click "Rotate JWT Secret" to invalidate all existing signed JWTs globally.')
    console.log(
      '   - Update the SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY in your env configuration.'
    )
  } catch (error: any) {
    console.error('❌ Security audit process crashed:', error.message)
  }
}

runSecurityAudit()
