// ============================================================================
// TRUF GAMING — Venue Repository
// All database operations for venues, images, and pricing.
// No business logic — only data access.
// ============================================================================

import { createAdminClient } from '@/lib/supabase/admin'
import type { Venue, VenueImage, VenuePricing, VerificationStatus } from '@/types/models'

const supabase = createAdminClient()

export const venueRepository = {
  async findById(id: string): Promise<Venue | null> {
    const { data } = await supabase.from('venues').select('*').eq('id', id).maybeSingle()
    return data as Venue | null
  },

  async findByOwnerId(ownerId: string): Promise<Venue[]> {
    const { data } = await supabase.from('venues').select('*').eq('owner_id', ownerId).order('name')
    return (data || []) as Venue[]
  },

  async findAll(filters?: {
    status?: VerificationStatus
    search?: string
    limit?: number
    offset?: number
  }): Promise<{ venues: Venue[]; count: number }> {
    let query = supabase.from('venues').select('*', { count: 'exact' })
    if (filters?.status) query = query.eq('verification_status', filters.status)
    if (filters?.search) query = query.ilike('name', `%${filters.search}%`)
    if (filters?.limit) query = query.limit(filters.limit)
    if (filters?.offset)
      query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1)
    query = query.order('name')
    const { data, count } = await query
    return { venues: (data || []) as Venue[], count: count || 0 }
  },

  async create(venue: Partial<Venue>): Promise<Venue> {
    const { data, error } = await supabase.from('venues').insert(venue).select().single()
    if (error) throw error
    return data as Venue
  },

  async update(id: string, updates: Partial<Venue>): Promise<Venue> {
    const { data, error } = await supabase
      .from('venues')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Venue
  },

  async updateVerificationStatus(
    id: string,
    status: VerificationStatus,
    adminNotes?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('venues')
      .update({ verification_status: status, admin_notes: adminNotes || null })
      .eq('id', id)
    if (error) throw error
  },

  async getImages(venueId: string): Promise<VenueImage[]> {
    const { data } = await supabase.from('venue_images').select('*').eq('venue_id', venueId)
    return (data || []) as VenueImage[]
  },

  async getPricing(venueId: string): Promise<VenuePricing | null> {
    const { data } = await supabase
      .from('venue_pricing')
      .select('*')
      .eq('venue_id', venueId)
      .maybeSingle()
    return data as VenuePricing | null
  },
}
