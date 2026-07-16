import { XP } from '@/config/settings'

export class XpService {
  /**
   * Central level calculation function derived entirely from total XP.
   * Never manually increment or decrement levels.
   */
  calculateLevel(totalXp: number): number {
    const rawLevel = 1 + Math.floor(Math.max(0, totalXp) / XP.xpPerLevel)
    return Math.min(XP.maxLevel, Math.max(1, rawLevel))
  }

  /**
   * Awards XP for a successful booking, applying idempotency and audit logs.
   */
  async awardXpForBooking(supabase: any, userId: string, bookingId: string) {
    // 1. Idempotency Check: check if already awarded XP for this booking
    const { data: existingLog, error: fetchLogErr } = await supabase
      .from('xp_audit_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('booking_id', bookingId)
      .eq('action', 'BOOKED')
      .maybeSingle()

    if (fetchLogErr) throw fetchLogErr
    if (existingLog) {
      return { success: false, reason: 'Duplicate booking request ignored.' }
    }

    // 2. Fetch current profile state
    const { data: profile, error: profileErr } = await supabase
      .from('customer_profiles')
      .select('xp, level')
      .eq('user_id', userId)
      .maybeSingle()

    if (profileErr) throw profileErr

    const xpBefore = profile?.xp ?? 0
    const levelBefore = profile?.level ?? 1

    const xpChange = XP.bookingAward
    const xpAfter = xpBefore + xpChange
    const levelAfter = this.calculateLevel(xpAfter)

    // 3. Update customer profile (XP and Level)
    const { error: updateErr } = await supabase
      .from('customer_profiles')
      .update({
        xp: xpAfter,
        level: levelAfter,
      })
      .eq('user_id', userId)

    if (updateErr) throw updateErr

    // 4. Create immutable audit log
    const { error: logErr } = await supabase.from('xp_audit_logs').insert({
      user_id: userId,
      booking_id: bookingId,
      action: 'BOOKED',
      xp_before: xpBefore,
      xp_change: xpChange,
      xp_after: xpAfter,
      level_before: levelBefore,
      level_after: levelAfter,
    })

    if (logErr) throw logErr

    return {
      success: true,
      levelUp: levelAfter > levelBefore,
      xp: xpAfter,
      level: levelAfter,
    }
  }

  /**
   * Deducts XP for a cancelled booking, applying idempotency and audit logs.
   */
  async deductXpForCancellation(supabase: any, userId: string, bookingId: string) {
    // 1. Verify that booking XP was previously awarded ('BOOKED' log exists)
    const { data: bookedLog, error: fetchBookedErr } = await supabase
      .from('xp_audit_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('booking_id', bookingId)
      .eq('action', 'BOOKED')
      .maybeSingle()

    if (fetchBookedErr) throw fetchBookedErr
    if (!bookedLog) {
      return { success: false, reason: 'No booking XP log found to deduct.' }
    }

    // 2. Idempotency Check: check if already cancelled/deducted
    const { data: cancelledLog, error: fetchCancelledErr } = await supabase
      .from('xp_audit_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('booking_id', bookingId)
      .eq('action', 'CANCELLED')
      .maybeSingle()

    if (fetchCancelledErr) throw fetchCancelledErr
    if (cancelledLog) {
      return { success: false, reason: 'Duplicate cancellation request ignored.' }
    }

    // 3. Fetch current profile state
    const { data: profile, error: profileErr } = await supabase
      .from('customer_profiles')
      .select('xp, level')
      .eq('user_id', userId)
      .maybeSingle()

    if (profileErr) throw profileErr

    const xpBefore = profile?.xp ?? 0
    const levelBefore = profile?.level ?? 1

    const xpChange = -XP.bookingAward
    const xpAfter = Math.max(0, xpBefore + xpChange) // Clamp XP to prevent negative
    const levelAfter = this.calculateLevel(xpAfter) // Level will never fall below 1

    // 4. Update customer profile
    const { error: updateErr } = await supabase
      .from('customer_profiles')
      .update({
        xp: xpAfter,
        level: levelAfter,
      })
      .eq('user_id', userId)

    if (updateErr) throw updateErr

    // 5. Create immutable audit log
    const { error: logErr } = await supabase.from('xp_audit_logs').insert({
      user_id: userId,
      booking_id: bookingId,
      action: 'CANCELLED',
      xp_before: xpBefore,
      xp_change: xpChange,
      xp_after: xpAfter,
      level_before: levelBefore,
      level_after: levelAfter,
    })

    if (logErr) throw logErr

    return {
      success: true,
      xp: xpAfter,
      level: levelAfter,
    }
  }
}

export const xpService = new XpService()
