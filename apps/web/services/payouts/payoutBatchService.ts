import { SupabaseClient } from '@supabase/supabase-js'
import { translatePostgresError, PayoutDomainError } from './errors'

export class PayoutBatchService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Approves a DRAFT payout batch.
   */
  async approveBatch(params: { batchId: string; approverId: string }): Promise<void> {
    if (!params.batchId || !params.approverId) {
      throw new PayoutDomainError('INVALID_INPUT', 'Missing batchId or approverId.')
    }

    const { error } = await this.supabase.rpc('approve_payout_batch_v1', {
      p_batch_id: params.batchId,
      p_approver_id: params.approverId,
    })

    if (error) {
      throw translatePostgresError(error)
    }
  }

  /**
   * Executes an APPROVED batch by creating transfers.
   */
  async executeBatch(params: {
    batchId: string
    provider: string
    executedBy: string
  }): Promise<{ transfersCreated: number }> {
    if (!params.batchId || !params.provider || !params.executedBy) {
      throw new PayoutDomainError('INVALID_INPUT', 'Missing batchId, provider, or executedBy.')
    }

    const { data, error } = await this.supabase.rpc('create_payout_transfers_v1', {
      p_batch_id: params.batchId,
      p_provider: params.provider,
      p_executed_by: params.executedBy,
    })

    if (error) {
      throw translatePostgresError(error)
    }

    return { transfersCreated: data as number }
  }
}
