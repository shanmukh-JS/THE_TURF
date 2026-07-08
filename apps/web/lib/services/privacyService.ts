// ============================================================================
// TRUF GAMING — Privacy & Compliance Service
// Handles GDPR/CCPA compliant data export and account deletion workflows.
// ============================================================================

import { createAdminClient } from '@/lib/supabase/admin'
import { writeAuditLog } from '@/lib/utils/logger'

export class PrivacyService {
  /**
   * Orchestrates a soft-delete of a user account to comply with data retention
   * policies, while obfuscating PII (Personally Identifiable Information).
   */
  async deleteAccount(userId: string): Promise<void> {
    const supabase = createAdminClient()

    // 1. Obfuscate PII in users table but keep the ID for financial integrity
    const { error: userError } = await supabase
      .from('users')
      .update({
        email: `deleted_${userId}@trufgaming.local`,
        full_name: 'Deleted User',
        phone: null,
        is_suspended: true,
      })
      .eq('id', userId)

    if (userError) throw userError

    // 2. Clear profile tables
    await supabase.from('customer_profiles').delete().eq('user_id', userId)
    await supabase.from('owner_profiles').delete().eq('user_id', userId)

    // 3. Revoke active sessions via Supabase Auth admin API
    await supabase.auth.admin.deleteUser(userId)

    // 4. Log the compliance event
    await writeAuditLog({
      actor_id: userId,
      module: 'SYSTEM',
      action: 'ACCOUNT_DELETED',
      target_id: userId,
      new_value: { status: 'soft_deleted_with_pii_scrubbed' },
    })
  }

  /**
   * Generates a comprehensive JSON export of all user data for GDPR Right to Access.
   */
  async exportUserData(userId: string): Promise<Record<string, any>> {
    const supabase = createAdminClient()

    const [userReq, bookingsReq, reviewsReq] = await Promise.all([
      supabase.from('users').select('*').eq('id', userId).single(),
      supabase.from('bookings').select('*').eq('customer_id', userId),
      supabase.from('reviews').select('*').eq('customer_id', userId),
    ])

    await writeAuditLog({
      actor_id: userId,
      module: 'SYSTEM',
      action: 'DATA_EXPORT_REQUESTED',
      target_id: userId,
    })

    return {
      profile: userReq.data,
      bookings: bookingsReq.data || [],
      reviews: reviewsReq.data || [],
      exported_at: new Date().toISOString(),
    }
  }
}

export const privacyService = new PrivacyService()
