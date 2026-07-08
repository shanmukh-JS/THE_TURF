// ============================================================================
// TRUF GAMING — Booking Repository
// All database operations for bookings.
// ============================================================================

import { createAdminClient } from '@/lib/supabase/admin'
import type { Booking, BookingStatus } from '@/types/models'

const supabase = createAdminClient()

export const bookingRepository = {
  async findById(id: string): Promise<Booking | null> {
    const { data } = await supabase
      .from('bookings')
      .select('*, slot:slots(*), venue:venues(name, address)')
      .eq('id', id)
      .maybeSingle()
    return data as Booking | null
  },

  async findByCustomerId(
    customerId: string,
    filters?: { status?: BookingStatus; limit?: number; offset?: number }
  ): Promise<{ bookings: Booking[]; count: number }> {
    let query = supabase
      .from('bookings')
      .select('*, slot:slots(*), venue:venues(name, address)', { count: 'exact' })
      .eq('customer_id', customerId)
    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.limit) query = query.limit(filters.limit)
    if (filters?.offset)
      query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1)
    query = query.order('id', { ascending: false })
    const { data, count } = await query
    return { bookings: (data || []) as Booking[], count: count || 0 }
  },

  async findByVenueId(
    venueId: string,
    filters?: { status?: BookingStatus; limit?: number; offset?: number }
  ): Promise<{ bookings: Booking[]; count: number }> {
    let query = supabase
      .from('bookings')
      .select('*, slot:slots(*), customer:users(email)', { count: 'exact' })
      .eq('venue_id', venueId)
    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.limit) query = query.limit(filters.limit)
    if (filters?.offset)
      query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1)
    query = query.order('id', { ascending: false })
    const { data, count } = await query
    return { bookings: (data || []) as Booking[], count: count || 0 }
  },

  async findAll(filters?: {
    status?: BookingStatus
    search?: string
    limit?: number
    offset?: number
  }): Promise<{ bookings: Booking[]; count: number }> {
    let query = supabase
      .from('bookings')
      .select('*, slot:slots(*), venue:venues(name), customer:users(email)', { count: 'exact' })
    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.limit) query = query.limit(filters.limit)
    if (filters?.offset)
      query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1)
    query = query.order('id', { ascending: false })
    const { data, count } = await query
    return { bookings: (data || []) as Booking[], count: count || 0 }
  },

  async create(booking: Omit<Booking, 'id'>): Promise<Booking> {
    const { data, error } = await supabase.from('bookings').insert(booking).select().single()
    if (error) throw error
    return data as Booking
  },

  async updateStatus(id: string, status: BookingStatus): Promise<void> {
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id)
    if (error) throw error
  },

  async countByCustomer(customerId: string, status?: BookingStatus): Promise<number> {
    let query = supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', customerId)
    if (status) query = query.eq('status', status)
    const { count } = await query
    return count || 0
  },
}
