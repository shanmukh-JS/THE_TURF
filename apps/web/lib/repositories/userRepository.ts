// ============================================================================
// TRUF GAMING — User Repository
// All database operations for users, customer profiles, and owner profiles.
// ============================================================================

import { createAdminClient } from '@/lib/supabase/admin'
import type { User, CustomerProfile, OwnerProfile } from '@/types/models'

const supabase = createAdminClient()

export const userRepository = {
  async findById(id: string): Promise<User | null> {
    const { data } = await supabase.from('users').select('*').eq('id', id).maybeSingle()
    return data as User | null
  },

  async findByEmail(email: string): Promise<User | null> {
    const { data } = await supabase.from('users').select('*').ilike('email', email).maybeSingle()
    return data as User | null
  },

  async findAll(filters?: {
    role?: string
    search?: string
    limit?: number
    offset?: number
  }): Promise<{ users: User[]; count: number }> {
    let query = supabase.from('users').select('*', { count: 'exact' })
    if (filters?.role) query = query.eq('role', filters.role)
    if (filters?.search) query = query.or(`email.ilike.%${filters.search}%`)
    if (filters?.limit) query = query.limit(filters.limit)
    if (filters?.offset)
      query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1)
    query = query.order('created_at', { ascending: false })
    const { data, count } = await query
    return { users: (data || []) as User[], count: count || 0 }
  },

  async suspend(id: string, suspended: boolean): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ is_suspended: suspended, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  },

  // ---- Customer Profiles ----

  async getCustomerProfile(userId: string): Promise<CustomerProfile | null> {
    const { data } = await supabase
      .from('customer_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    return data as CustomerProfile | null
  },

  // ---- Owner Profiles ----

  async getOwnerProfile(userId: string): Promise<OwnerProfile | null> {
    const { data } = await supabase
      .from('owner_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    return data as OwnerProfile | null
  },

  async getOwnerProfileById(profileId: string): Promise<OwnerProfile | null> {
    const { data } = await supabase
      .from('owner_profiles')
      .select('*')
      .eq('id', profileId)
      .maybeSingle()
    return data as OwnerProfile | null
  },
}
