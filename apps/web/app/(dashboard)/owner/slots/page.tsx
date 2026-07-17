'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  CalendarDays,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  X,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  Briefcase,
  Layers,
} from 'lucide-react'
import {
  DashboardAnimationWrapper,
  DashboardAnimationItem,
} from '@/components/ui/DashboardAnimationWrapper'

export default function ManageSlotsPage() {
  const supabase = createClient()
  const [venues, setVenues] = useState<any[]>([])
  const [slots, setSlots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'list' | 'calendar'>('list')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Owner profile ref
  const [ownerProfileId, setOwnerProfileId] = useState<string | null>(null)

  // Filters
  const [selectedVenueFilter, setSelectedVenueFilter] = useState('ALL')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Default values
  const [todayStr] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })

  const [defaultTimeStr] = useState(() => {
    const d = new Date()
    d.setHours(d.getHours() + 1)
    d.setMinutes(0)
    return `${String(d.getHours()).padStart(2, '0')}:00`
  })

  // Create slot form state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isBulk, setIsBulk] = useState(false)
  const [repeatDaily, setRepeatDaily] = useState(false)
  const [repeatDays, setRepeatDays] = useState('7')

  const [formData, setFormData] = useState({
    venueId: '',
    date: todayStr,
    startTime: defaultTimeStr,
    endTime: '22:00', // for bulk, or end time for single
    duration: '60', // 30, 60, 90 mins
    price: '1000',
    maxPlayers: '',
    sportType: 'Cricket',
    status: 'Available',
  })

  // Edit slot modal state
  const [editingSlot, setEditingSlot] = useState<any | null>(null)
  const [editFormData, setEditFormData] = useState({
    price: '',
    maxPlayers: '',
    status: 'Available',
  })

  // Calendar date navigator
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
    return new Date(d.setDate(diff))
  })

  // Min date for forms

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // Fetch owner data
  useEffect(() => {
    const fetchOwnerAndVenues = async () => {
      setLoading(true)

      // Get session user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Get owner profile
      const { data: profile } = await supabase
        .from('owner_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      let ownerProfileId = profile?.id

      if (!profile) {
        // Automatically create an owner profile for the user (e.g., admin testing)
        const { data: newProfile, error: createError } = await supabase
          .from('owner_profiles')
          .insert({
            user_id: user.id,
            full_name: user.email?.split('@')[0] || 'Admin',
            business_name: 'Turf Gaming Testing',
          })
          .select('id')
          .single()

        if (createError || !newProfile) {
          setToast({
            message: `Creation failed: ${createError?.message || 'Unknown error'}`,
            type: 'error',
          })
          setLoading(false)
          return
        }
        ownerProfileId = newProfile.id
      }

      setOwnerProfileId(ownerProfileId)

      // Fetch venues
      const { data: venuesData } = await supabase
        .from('venues')
        .select('id, name, verification_status, venue_pricing(price)')
        .eq('owner_id', ownerProfileId)
        .eq('is_disabled', false)

      if (venuesData) {
        const mappedVenues = venuesData.map((v) => ({
          id: v.id,
          name: v.name,
          verification_status: v.verification_status,
          price: Array.isArray(v.venue_pricing)
            ? (v.venue_pricing[0] as any)?.price
            : (v.venue_pricing as any)?.price || 1000,
        }))
        setVenues(mappedVenues)
        if (mappedVenues.length > 0) {
          setFormData((prev) => ({
            ...prev,
            venueId: mappedVenues[0]?.id || '',
            price: mappedVenues[0]?.price?.toString() || '1000',
          }))
        }
      }

      setLoading(false)
    }

    fetchOwnerAndVenues()
  }, [])

  // Fetch slots whenever owner profile ID changes
  const fetchSlots = async () => {
    if (!ownerProfileId) return

    const { data: slotsData, error } = await supabase
      .from('slots')
      .select(
        `
        *,
        venues(name)
      `
      )
      .eq('owner_id', ownerProfileId)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) {
      console.error('fetchSlots error:', error)
    } else if (slotsData) {
      console.log('fetchSlots data:', slotsData)
      const now = new Date()
      const processedSlots = slotsData.map((s: any) => {
        if (!s.is_booked && new Date(s.end_time) < now && s.status !== 'Expired') {
          return { ...s, status: 'Expired' }
        }
        return s
      })
      setSlots(processedSlots)
    }
  }

  useEffect(() => {
    if (ownerProfileId) {
      fetchSlots()
    }
  }, [ownerProfileId])

  // Real-time synchronization
  useEffect(() => {
    if (!ownerProfileId) return

    const channel = supabase
      .channel('owner-slots-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'slots', filter: `owner_id=eq.${ownerProfileId}` },
        () => {
          fetchSlots()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [ownerProfileId])

  // Time formatting helpers
  const formatTimeStr = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Validate overlapping slot timings
  const checkOverlapping = (
    venueId: string,
    date: string,
    startTime: string, // format HH:MM
    endTime: string, // format HH:MM
    excludeSlotId?: string
  ) => {
    const newStart = new Date(`${date}T${startTime}:00`)
    const newEnd = new Date(`${date}T${endTime}:00`)

    // Loop through existing slots for date and venue
    const conflicting = slots.find((s) => {
      if (s.venue_id !== venueId || s.date !== date || s.id === excludeSlotId) return false

      const sStart = new Date(s.start_time)
      const sEnd = new Date(s.end_time)

      return newStart < sEnd && newEnd > sStart
    })

    return conflicting ? conflicting : null
  }

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ownerProfileId || !formData.venueId || !formData.date) return

    const selectedV = venues.find((v) => v.id === formData.venueId)
    if (selectedV?.verification_status !== 'APPROVED') {
      setToast({
        message: 'This turf is not approved yet. Slots can only be generated for approved venues.',
        type: 'error',
      })
      return
    }

    setSubmitting(true)

    // Duration numeric parse
    const durationMins = parseInt(formData.duration)
    const priceNum = parseFloat(formData.price)
    const maxPl = formData.maxPlayers ? parseInt(formData.maxPlayers) : null

    // Determine how many days to iterate
    const numDays = repeatDaily ? parseInt(repeatDays) : 1
    const slotsToInsert = []

    for (let dayOffset = 0; dayOffset < numDays; dayOffset++) {
      const currentDate = new Date(formData.date)
      currentDate.setDate(currentDate.getDate() + dayOffset)
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`

      if (!isBulk) {
        // Single slot creation
        const startDate = new Date(`${dateStr}T${formData.startTime}:00`)

        // Calculate End Time based on duration
        const endDate = new Date(startDate.getTime() + durationMins * 60 * 1000)

        const endHours = String(endDate.getHours()).padStart(2, '0')
        const endMins = String(endDate.getMinutes()).padStart(2, '0')
        const endTimeStr = `${endHours}:${endMins}`

        if (endDate <= startDate) {
          setToast({ message: 'End time must be after start time.', type: 'error' })
          setSubmitting(false)
          return
        }

        const conflict = checkOverlapping(formData.venueId, dateStr, formData.startTime, endTimeStr)
        if (conflict) {
          setToast({
            message: `Slot overlaps with an existing slot on ${dateStr}: ${formatTimeStr(conflict.start_time)} - ${formatTimeStr(conflict.end_time)}`,
            type: 'error',
          })
          setSubmitting(false)
          return
        }

        slotsToInsert.push({
          owner_id: ownerProfileId,
          venue_id: formData.venueId,
          date: dateStr,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          duration: durationMins,
          price: priceNum,
          max_players: maxPl,
          sport_type: formData.sportType,
          status: formData.status,
          is_booked: formData.status === 'Booked',
        })
      } else {
        // Bulk slot creation
        const startMinutes = parseTimeToMinutes(formData.startTime)
        const endMinutes = parseTimeToMinutes(formData.endTime)

        if (endMinutes <= startMinutes) {
          setToast({ message: 'End time must be after start time.', type: 'error' })
          setSubmitting(false)
          return
        }

        let cursor = startMinutes
        while (cursor + durationMins <= endMinutes) {
          const currentStartStr = minutesToTimeStr(cursor)
          const currentEndStr = minutesToTimeStr(cursor + durationMins)

          const conflict = checkOverlapping(
            formData.venueId,
            dateStr,
            currentStartStr,
            currentEndStr
          )
          if (conflict) {
            setToast({
              message: `Overlap encountered in bulk generation on ${dateStr}: ${currentStartStr} - ${currentEndStr}`,
              type: 'error',
            })
            setSubmitting(false)
            return
          }

          const startDate = new Date(`${dateStr}T${currentStartStr}:00`)
          const endDate = new Date(`${dateStr}T${currentEndStr}:00`)

          slotsToInsert.push({
            owner_id: ownerProfileId,
            venue_id: formData.venueId,
            date: dateStr,
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString(),
            duration: durationMins,
            price: priceNum,
            max_players: maxPl,
            sport_type: formData.sportType,
            status: formData.status,
            is_booked: formData.status === 'Booked',
          })

          cursor += durationMins
        }
      }
    }

    if (slotsToInsert.length === 0) {
      setToast({
        message: 'No slots generated. Check your settings.',
        type: 'error',
      })
      setSubmitting(false)
      return
    }

    const { error } = await supabase.from('slots').insert(slotsToInsert)

    if (error) {
      setToast({ message: error.message, type: 'error' })
    } else {
      setToast({
        message: `Successfully generated ${slotsToInsert.length} slots.`,
        type: 'success',
      })
      setShowCreateModal(false)
    }

    setSubmitting(false)
  }

  // Time conversion utilities
  const parseTimeToMinutes = (timeStr: string) => {
    const parts = timeStr.split(':').map(Number)
    const h = parts[0] || 0
    const m = parts[1] || 0
    return h * 60 + m
  }

  const minutesToTimeStr = (totalMins: number) => {
    const hours = Math.floor(totalMins / 60)
    const mins = totalMins % 60
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
  }

  // Delete Action with confirm
  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('Are you sure you want to delete this slot? This action cannot be undone.')) return

    // Optimistic UI: remove from state immediately
    const prevSlots = slots
    setSlots((prev) => prev.filter((s) => s.id !== slotId))

    const { error } = await supabase.from('slots').delete().eq('id', slotId)

    if (error) {
      // Restore on failure
      setSlots(prevSlots)
      setToast({ message: error.message, type: 'error' })
    } else {
      setToast({ message: 'Slot deleted successfully.', type: 'success' })
    }
  }

  // Block/Unblock actions
  const handleToggleBlockSlot = async (slot: any) => {
    const newStatus = slot.status === 'Blocked' ? 'Available' : 'Blocked'

    // Optimistic UI: update state immediately
    const prevSlots = slots
    setSlots((prev) =>
      prev.map((s) => (s.id === slot.id ? { ...s, status: newStatus, is_booked: false } : s))
    )

    const { error } = await supabase
      .from('slots')
      .update({ status: newStatus, is_booked: false })
      .eq('id', slot.id)

    if (error) {
      setSlots(prevSlots)
      setToast({ message: error.message, type: 'error' })
    } else {
      setToast({ message: `Slot is now ${newStatus.toLowerCase()}.`, type: 'success' })
    }
  }

  // Quick edits
  const handleEditSlotSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSlot) return

    const updatedFields = {
      price: parseFloat(editFormData.price),
      max_players: editFormData.maxPlayers ? parseInt(editFormData.maxPlayers) : null,
      status: editFormData.status,
      is_booked: editFormData.status === 'Booked',
    }

    // Optimistic UI: update state immediately
    const prevSlots = slots
    setSlots((prev) => prev.map((s) => (s.id === editingSlot.id ? { ...s, ...updatedFields } : s)))
    setEditingSlot(null)

    const { error } = await supabase.from('slots').update(updatedFields).eq('id', editingSlot.id)

    if (error) {
      setSlots(prevSlots)
      setToast({ message: error.message, type: 'error' })
    } else {
      setToast({ message: 'Slot updated successfully.', type: 'success' })
    }
  }

  // Filter slots to display
  const filteredSlots = slots.filter((s) => {
    if (selectedVenueFilter !== 'ALL' && s.venue_id !== selectedVenueFilter) return false
    if (selectedStatusFilter !== 'ALL' && s.status !== selectedStatusFilter) return false
    if (searchQuery) {
      const turfName = s.venues?.name?.toLowerCase() || ''
      const sport = s.sport_type?.toLowerCase() || ''
      const match = searchQuery.toLowerCase()
      if (!turfName.includes(match) && !sport.includes(match)) return false
    }
    return true
  })

  // Generate calendar days for current week navigator
  const getWeekDates = () => {
    const dates = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart)
      d.setDate(currentWeekStart.getDate() + i)
      dates.push(d)
    }
    return dates
  }

  const changeWeek = (direction: number) => {
    const d = new Date(currentWeekStart)
    d.setDate(currentWeekStart.getDate() + direction * 7)
    setCurrentWeekStart(d)
  }

  return (
    <DashboardAnimationWrapper className="p-8 space-y-8">
      {/* Header */}
      <DashboardAnimationItem className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Manage Slots</h1>
          <p className="text-gray-400 mt-1">
            Configure and generate booking schedules for your turf boxes.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-black font-semibold transition-all shadow-lg shadow-green-900/30 text-sm"
        >
          <Plus className="w-4 h-4" /> Create Slots
        </button>
      </DashboardAnimationItem>

      {/* Tabs & Filters */}
      <DashboardAnimationItem className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 bg-white/5 rounded-xl p-1 border border-white/8 w-full sm:w-fit">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'list'
                ? 'bg-green-500 text-black shadow-lg shadow-green-900/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Table View
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'calendar'
                ? 'bg-green-500 text-black shadow-lg shadow-green-900/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Calendar View
          </button>
        </div>

        {/* Global Filters */}
        <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-xl px-3 py-2 flex-1 sm:flex-none">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search sport or turf..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-white text-sm placeholder:text-gray-500 w-full sm:w-40"
            />
          </div>

          <select
            value={selectedVenueFilter}
            onChange={(e) => setSelectedVenueFilter(e.target.value)}
            className="bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-green-500/50"
          >
            <option value="ALL" className="text-black">
              All Turfs
            </option>
            {venues.map((v) => (
              <option key={v.id} value={v.id} className="text-black">
                {v.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-green-500/50"
          >
            <option value="ALL" className="text-black">
              All Statuses
            </option>
            <option value="Available" className="text-black">
              Available
            </option>
            <option value="Booked" className="text-black">
              Booked
            </option>
            <option value="Blocked" className="text-black">
              Blocked
            </option>
          </select>
        </div>
      </DashboardAnimationItem>

      {/* Main Panel Content */}
      <DashboardAnimationItem>
        {loading ? (
          <div className="py-20 text-center text-gray-500 animate-pulse">Loading slots...</div>
        ) : activeTab === 'list' ? (
          // TABLE VIEW
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden">
            {filteredSlots.length === 0 ? (
              <div className="py-16 text-center text-gray-500">
                No slots found matching the criteria. Click &quot;Create Slots&quot; to generate
                slots.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/8 bg-white/5 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Turf Name</th>
                      <th className="px-6 py-4">Sport</th>
                      <th className="px-6 py-4">Timing</th>
                      <th className="px-6 py-4">Duration</th>
                      <th className="px-6 py-4">Price</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredSlots.map((slot) => (
                      <tr
                        key={slot.id}
                        className="hover:bg-white/[0.01] transition-colors text-sm text-gray-300"
                      >
                        <td className="px-6 py-4 font-medium text-white">
                          {new Date(slot.date).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-6 py-4">{slot.venues?.name || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <span className="bg-white/5 border border-white/8 text-white px-2 py-0.5 rounded-md text-xs font-medium">
                            {slot.sport_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">
                          {formatTimeStr(slot.start_time)} - {formatTimeStr(slot.end_time)}
                        </td>
                        <td className="px-6 py-4">{slot.duration} mins</td>
                        <td className="px-6 py-4 text-white font-semibold">₹{slot.price}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold w-fit ${
                              slot.status === 'Available'
                                ? 'bg-green-500/10 text-green-400'
                                : slot.status === 'Booked'
                                  ? 'bg-red-500/10 text-red-400'
                                  : 'bg-gray-500/10 text-gray-400'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                slot.status === 'Available'
                                  ? 'bg-green-400'
                                  : slot.status === 'Booked'
                                    ? 'bg-red-400'
                                    : 'bg-gray-400'
                              }`}
                            />
                            {slot.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            {slot.status !== 'Expired' && slot.status !== 'Booked' && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingSlot(slot)
                                    setEditFormData({
                                      price: slot.price.toString(),
                                      maxPlayers: slot.max_players
                                        ? slot.max_players.toString()
                                        : '',
                                      status: slot.status,
                                    })
                                  }}
                                  className="p-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
                                  title="Edit Details"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleToggleBlockSlot(slot)}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    slot.status === 'Blocked'
                                      ? 'bg-green-500/10 hover:bg-green-500/20 text-green-400'
                                      : 'bg-gray-500/10 hover:bg-gray-500/20 text-gray-400'
                                  }`}
                                  title={slot.status === 'Blocked' ? 'Unblock Slot' : 'Block Slot'}
                                  disabled={slot.status === 'Booked'}
                                >
                                  {slot.status === 'Blocked' ? (
                                    <Unlock className="w-4 h-4" />
                                  ) : (
                                    <Lock className="w-4 h-4" />
                                  )}
                                </button>
                              </>
                            )}
                            {slot.status !== 'Booked' && (
                              <button
                                onClick={() => handleDeleteSlot(slot.id)}
                                className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                title="Delete Slot"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          // CALENDAR VIEW
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 space-y-6">
            {/* Calendar Navigator */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => changeWeek(-1)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="font-bold text-white text-base">
                {getWeekDates()[0]?.toLocaleDateString([], { month: 'short', day: 'numeric' })} –{' '}
                {getWeekDates()[6]?.toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </h3>
              <button
                onClick={() => changeWeek(1)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Grid Schedule */}
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
              {getWeekDates().map((date, idx) => {
                const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                const dailySlots = filteredSlots.filter((s) => s.date === dateKey)

                return (
                  <div
                    key={idx}
                    className={`space-y-3 rounded-xl p-3 border transition-all ${
                      dateKey === todayStr
                        ? 'bg-green-500/[0.03] border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.05)]'
                        : 'bg-black/20 border-white/5'
                    }`}
                  >
                    <div
                      className={`text-center pb-2 border-b ${
                        dateKey === todayStr ? 'border-green-500/20' : 'border-white/5'
                      }`}
                    >
                      <p
                        className={`text-xs ${
                          dateKey === todayStr
                            ? 'text-green-400/90 font-semibold tracking-wider'
                            : 'text-gray-500'
                        }`}
                      >
                        {dateKey === todayStr
                          ? 'Today'
                          : date.toLocaleDateString([], { weekday: 'short' })}
                      </p>
                      <p
                        className={`font-bold mt-1 ${
                          dateKey === todayStr ? 'text-lg text-green-400' : 'text-sm text-white'
                        }`}
                      >
                        {date.toLocaleDateString([], { day: 'numeric' })}
                      </p>
                    </div>

                    <div className="space-y-2">
                      {dailySlots.length === 0 ? (
                        <p className="text-[10px] text-gray-600 text-center py-4">No slots</p>
                      ) : (
                        dailySlots.map((slot) => (
                          <div
                            key={slot.id}
                            onClick={() => {
                              if (slot.status === 'Expired' || slot.status === 'Booked') return
                              setEditingSlot(slot)
                              setEditFormData({
                                price: slot.price.toString(),
                                maxPlayers: slot.max_players ? slot.max_players.toString() : '',
                                status: slot.status,
                              })
                            }}
                            className={`p-2 rounded-lg transition-all border text-left flex flex-col gap-1 ${
                              slot.status === 'Expired'
                                ? 'cursor-not-allowed opacity-50'
                                : 'cursor-pointer'
                            } ${
                              slot.status === 'Available'
                                ? 'bg-green-500/10 border-green-500/20 text-green-400 hover:border-green-500/40'
                                : slot.status === 'Booked'
                                  ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:border-red-500/40'
                                  : 'bg-gray-500/10 border-white/5 text-gray-400 hover:border-white/10'
                            }`}
                          >
                            <p className="text-[10px] font-bold truncate">{slot.venues?.name}</p>
                            <p className="text-[9px] font-mono">{formatTimeStr(slot.start_time)}</p>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[9px] font-semibold">₹{slot.price}</span>
                              <span className="text-[8px] uppercase tracking-wider">
                                {slot.sport_type}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </DashboardAnimationItem>

      {/* CREATE SLOTS MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0a0f0a] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-400" />
                Create Booking Slots
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSlot} className="p-6 space-y-4">
              {/* Toggle Bulk/Single */}
              <div className="grid grid-cols-2 gap-2 bg-white/5 rounded-xl p-1 border border-white/8">
                <button
                  type="button"
                  onClick={() => setIsBulk(false)}
                  className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                    !isBulk ? 'bg-green-500 text-black shadow' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Single Slot
                </button>
                <button
                  type="button"
                  onClick={() => setIsBulk(true)}
                  className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                    isBulk ? 'bg-green-500 text-black shadow' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Bulk Auto-Generate
                </button>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Turf Box</label>
                  <select
                    value={formData.venueId}
                    onChange={(e) => {
                      const selectedV = venues.find((v) => v.id === e.target.value)
                      setFormData({
                        ...formData,
                        venueId: e.target.value,
                        price: selectedV?.price?.toString() || formData.price,
                      })
                    }}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-green-500/50 font-medium"
                    required
                  >
                    {venues.map((v) => (
                      <option key={v.id} value={v.id} className="text-black">
                        {v.name} ({v.verification_status || 'PENDING'})
                      </option>
                    ))}
                  </select>

                  {formData.venueId && (
                    <div className="mt-2 text-xs">
                      {venues.find((v) => v.id === formData.venueId)?.verification_status ===
                      'APPROVED' ? (
                        <span className="text-green-400 font-semibold flex items-center gap-1">
                          🟢 Approved & Live
                        </span>
                      ) : (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mt-2 space-y-1">
                          <p className="font-bold flex items-center gap-1">
                            <span className="text-sm">⚠️</span> Verification Required
                          </p>
                          <p>
                            This venue is currently{' '}
                            {venues.find((v) => v.id === formData.venueId)?.verification_status ||
                              'PENDING'}
                            . Slots cannot be generated until the venue is approved.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Date</label>
                  <input
                    type="date"
                    min={todayStr}
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-green-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Sport Type</label>
                  <select
                    value={formData.sportType}
                    onChange={(e) => setFormData({ ...formData, sportType: e.target.value })}
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-green-500/50"
                  >
                    <option value="Cricket" className="text-black">
                      Cricket
                    </option>
                    <option value="Football" className="text-black">
                      Football
                    </option>
                    <option value="Badminton" className="text-black">
                      Badminton
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    {isBulk ? 'Range Start Time' : 'Start Time'}
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-green-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    {isBulk ? 'Range End Time' : 'Duration'}
                  </label>
                  {isBulk ? (
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      required
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-green-500/50"
                    />
                  ) : (
                    <select
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      required
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-green-500/50"
                    >
                      <option value="30" className="text-black">
                        30 Minutes
                      </option>
                      <option value="60" className="text-black">
                        60 Minutes (1 Hour)
                      </option>
                      <option value="90" className="text-black">
                        90 Minutes (1.5 Hours)
                      </option>
                      <option value="120" className="text-black">
                        120 Minutes (2 Hours)
                      </option>
                    </select>
                  )}
                </div>

                {isBulk && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Slot Partition Size</label>
                    <select
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      required
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-green-500/50"
                    >
                      <option value="30" className="text-black">
                        30 Minutes
                      </option>
                      <option value="60" className="text-black">
                        60 Minutes (1 Hour)
                      </option>
                      <option value="90" className="text-black">
                        90 Minutes (1.5 Hours)
                      </option>
                      <option value="120" className="text-black">
                        120 Minutes (2 Hours)
                      </option>
                    </select>
                  </div>
                )}

                <div className={!isBulk ? 'col-span-1' : ''}>
                  <label className="block text-xs text-gray-500 mb-1">
                    Price (₹) <span className="text-gray-600">(Locked to Venue)</span>
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    readOnly
                    required
                    min="1"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-gray-400 text-sm outline-none cursor-not-allowed select-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-green-500/50"
                  >
                    <option value="Available" className="text-black">
                      Available
                    </option>
                    <option value="Blocked" className="text-black">
                      Blocked
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Max Players (Optional)</label>
                  <input
                    type="number"
                    value={formData.maxPlayers}
                    onChange={(e) => setFormData({ ...formData, maxPlayers: e.target.value })}
                    placeholder="e.g. 12"
                    min="1"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-green-500/50"
                  />
                </div>
              </div>

              {/* Repeat Daily Option */}
              <div className="pt-4 border-t border-white/8 mt-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 transition-colors">
                  <input
                    type="checkbox"
                    id="repeatDaily"
                    checked={repeatDaily}
                    onChange={(e) => setRepeatDaily(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-600 text-green-500 focus:ring-green-500 bg-transparent"
                  />
                  <label
                    htmlFor="repeatDaily"
                    className="text-sm font-medium text-white cursor-pointer select-none"
                  >
                    Repeat these slots daily
                  </label>
                </div>

                {repeatDaily && (
                  <div className="mt-3 pl-4 border-l-2 border-green-500/30 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="block text-xs text-gray-400 mb-2">
                      How many days to repeat? (Including today)
                    </label>
                    <select
                      value={repeatDays}
                      onChange={(e) => setRepeatDays(e.target.value)}
                      className="w-full sm:w-1/2 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-green-500/50"
                    >
                      <option value="2" className="text-black">
                        2 Days
                      </option>
                      <option value="3" className="text-black">
                        3 Days
                      </option>
                      <option value="5" className="text-black">
                        5 Days
                      </option>
                      <option value="7" className="text-black">
                        1 Week (7 Days)
                      </option>
                      <option value="14" className="text-black">
                        2 Weeks (14 Days)
                      </option>
                      <option value="30" className="text-black">
                        1 Month (30 Days)
                      </option>
                    </select>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 justify-end pt-4 mt-4 border-t border-white/8">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white font-semibold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    submitting ||
                    venues.find((v) => v.id === formData.venueId)?.verification_status !==
                      'APPROVED'
                  }
                  className="px-5 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-black font-semibold text-sm transition-all shadow-lg shadow-green-900/30 disabled:opacity-55"
                >
                  {submitting ? 'Creating...' : 'Create Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK EDIT MODAL */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0a0f0a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Edit Slot Details</h2>
              <button
                onClick={() => setEditingSlot(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSlotSubmit} className="p-6 space-y-4">
              <div className="space-y-1 bg-black/20 p-4 rounded-xl border border-white/5 text-xs text-gray-400 space-y-2">
                <p>
                  <span className="font-bold text-white">Turf Box:</span> {editingSlot.venues?.name}
                </p>
                <p>
                  <span className="font-bold text-white">Sport Type:</span> {editingSlot.sport_type}
                </p>
                <p>
                  <span className="font-bold text-white">Timings:</span>{' '}
                  {new Date(editingSlot.date).toLocaleDateString()} at{' '}
                  {formatTimeStr(editingSlot.start_time)} - {formatTimeStr(editingSlot.end_time)}
                </p>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Price (₹)</label>
                <input
                  type="number"
                  value={editFormData.price}
                  onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                  required
                  min="1"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-green-500/50"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Max Players (Optional)</label>
                <input
                  type="number"
                  value={editFormData.maxPlayers}
                  onChange={(e) => setEditFormData({ ...editFormData, maxPlayers: e.target.value })}
                  placeholder="e.g. 12"
                  min="1"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-green-500/50"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Status</label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  required
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-green-500/50"
                  disabled={editingSlot.status === 'Booked'}
                >
                  <option value="Available" className="text-black">
                    Available
                  </option>
                  <option value="Blocked" className="text-black">
                    Blocked
                  </option>
                  {editingSlot.status === 'Booked' && (
                    <option value="Booked" className="text-black">
                      Booked
                    </option>
                  )}
                </select>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-white/8">
                <button
                  type="button"
                  onClick={() => setEditingSlot(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-green-500 hover:bg-green-400 text-black font-semibold text-xs transition-all shadow-lg shadow-green-900/30"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl shadow-2xl shadow-black/50 border border-gray-100">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-500" />
            )}
            <p className="text-sm font-semibold text-gray-900">{toast.message}</p>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </DashboardAnimationWrapper>
  )
}
