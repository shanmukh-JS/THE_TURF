import { SupabaseClient } from '@supabase/supabase-js'
import { translatePostgresError } from './errors'

export interface DailyReconciliationReport {
  reconciliation_date: string
  total_outstanding_liabilities: number
  total_in_transit_clearing: number
  today_settlement_volume: number
  last_reconciled_at: string | null
}

export class ReconciliationService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Fetches the current daily reconciliation view.
   */
  async getDailyReconciliationView(): Promise<DailyReconciliationReport> {
    const { data, error } = await this.supabase
      .from('daily_reconciliation_view')
      .select('*')
      .single()

    if (error) {
      throw translatePostgresError(error)
    }

    return data as DailyReconciliationReport
  }
}
