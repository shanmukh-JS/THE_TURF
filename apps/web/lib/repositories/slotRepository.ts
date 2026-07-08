// ============================================================================
// TRUF GAMING — Slot Repository
// All database operations for time slots.
// ============================================================================

import { createAdminClient } from '@/lib/supabase/admin'
import type { Slot, SlotStatus } from '@/types/models'

const supabase = createAdminClient()

export const slotRepository = {
  async findById(id: string): Promise<Slot | null> {
    const { data } = await supabase.from('slots').select('*').eq('id', id).maybeSingle()
    return data as Slot | null
  },

  async findByVenueAndDate(venueId: string, date: string): Promise<Slot[]> {
    const { data } = await supabase
      .from('slots')
      .select('*')
      .eq('venue_id', venueId)
      .eq('date', date)
      .order('start_time')
    return (data || []) as Slot[]
  },

  async findAvailable(venueId: string, date: string): Promise<Slot[]> {
    const { data } = await supabase
      .from('slots')
      .select('*')
      .eq('venue_id', venueId)
      .eq('date', date)
      .eq('is_booked', false)
      .eq('status', 'Available')
      .order('start_time')
    return (data || []) as Slot[]
  },

  async create(slots: Partial<Slot>[]): Promise<Slot[]> {
    const { data, error } = await supabase.from('slots').insert(slots).select()
    if (error) throw error
    return (data || []) as Slot[]
  },

  async updateStatus(id: string, status: SlotStatus, isBooked: boolean): Promise<void> {
    const { error } = await supabase
      .from('slots')
      .update({ status, is_booked: isBooked, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  },

  async lockSlot(id: string, lockExpiresAt: string): Promise<boolean> {
    const { error } = await supabase
      .from('slots')
      .update({
        is_locked: true,
        lock_expires: lockExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('is_booked', false)
      .eq('is_locked', false)
    return !error
  },

  async unlockExpiredSlots(): Promise<void> {
    await supabase
      .from('slots')
      .update({ is_locked: false, lock_expires: null })
      .eq('is_locked', true)
      .lt('lock_expires', new Date().toISOString())
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('slots').delete().eq('id', id)
    if (error) throw error
  },
}
