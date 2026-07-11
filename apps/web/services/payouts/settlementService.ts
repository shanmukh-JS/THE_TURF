import { SupabaseClient } from '@supabase/supabase-js'
import { translatePostgresError, PayoutDomainError } from './errors'

export class SettlementService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Records a settlement confirmation from a provider.
   */
  async recordSettlement(params: {
    transferId: string
    providerSettlementId: string
    amount: number
    settledAt: Date
    executedBy: string
  }): Promise<{ settlementId: string }> {
    if (!params.transferId || !params.providerSettlementId || params.amount <= 0) {
      throw new PayoutDomainError('INVALID_INPUT', 'Invalid parameters for recording settlement.')
    }

    const { data, error } = await this.supabase.rpc('record_settlement_v1', {
      p_transfer_id: params.transferId,
      p_provider_settlement_id: params.providerSettlementId,
      p_amount: params.amount,
      p_settled_at: params.settledAt.toISOString(),
      p_executed_by: params.executedBy,
    })

    if (error) {
      throw translatePostgresError(error)
    }

    return { settlementId: data as string }
  }
}
