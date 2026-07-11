import { SupabaseClient } from '@supabase/supabase-js'
import { translatePostgresError, PayoutDomainError } from './errors'

export class OwnerPayableService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Creates an owner payable.
   * Validates request, calls ONE RPC, translates errors.
   */
  async createPayable(params: {
    bookingId: string
    ownerId: string
    totalBookingAmount: number
    platformCommissionPct: number
    executedBy: string
  }): Promise<{ payableId: string }> {
    // 1. Validate Request (Basic checks, deep validation happens in schema)
    if (!params.bookingId || !params.ownerId || params.totalBookingAmount <= 0) {
      throw new PayoutDomainError(
        'INVALID_INPUT',
        'Invalid parameters provided for payable creation.'
      )
    }

    // 2. Call ONE RPC
    const { data, error } = await this.supabase.rpc('create_owner_payable_v1', {
      p_booking_id: params.bookingId,
      p_owner_id: params.ownerId,
      p_total_booking_amount: params.totalBookingAmount,
      p_platform_commission_pct: params.platformCommissionPct,
      p_executed_by: params.executedBy,
    })

    // 3. Translate Errors
    if (error) {
      throw translatePostgresError(error)
    }

    // 4. Return Result
    return { payableId: data as string }
  }
}
