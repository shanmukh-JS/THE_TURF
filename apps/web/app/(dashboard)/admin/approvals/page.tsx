'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  CheckCircle,
  XCircle,
  Search,
  Clock,
  FileText,
  CheckSquare,
  Loader2,
  AlertCircle,
  Download,
  Info,
  ChevronRight,
  User,
  Building,
  CreditCard,
  MapPin,
  Calendar,
  Sparkles,
  ClipboardList,
  Eye,
  FileCheck,
  History,
  Save,
  Check,
  AlertTriangle,
  ZoomIn,
  Copy,
  ExternalLink,
} from 'lucide-react'
import { logAdminAction } from '@/lib/admin/audit'
import {
  DashboardAnimationWrapper,
  DashboardAnimationItem,
} from '@/components/ui/DashboardAnimationWrapper'

export default function AdminApprovalsPage() {
  const [approvals, setApprovals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedVenue, setSelectedVenue] = useState<any | null>(null)

  // Custom Toasts
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Confirmation / Actions state
  const [confirmModal, setConfirmModal] = useState<{
    venue: any
    action: 'APPROVED' | 'REJECTED' | 'REQUEST_INFO' | 'SAVE_DRAFT'
  } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [reason, setReason] = useState('')
  const [adminNotes, setAdminNotes] = useState('')

  // Gallery view state
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [isFullscreenImage, setIsFullscreenImage] = useState(false)

  const supabase = createClient()

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchApprovals = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('venues')
      .select(
        `
        *,
        owner_profiles(
          id, full_name, business_name, user_id,
          owner_settings(business_phone, bank_account_name, bank_account_number, bank_ifsc, bank_upi)
        ),
        venue_images(url, is_cover),
        venue_pricing(price, weekend_price, peak_price, advance_limit)
      `
      )
      .order('id', { ascending: false })

    if (data) setApprovals(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchApprovals()
  }, [])

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-approvals-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'venues' }, () =>
        fetchApprovals()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleUpdateStatus = async () => {
    if (!confirmModal) return
    setActionLoading(true)

    const { venue, action } = confirmModal
    let statusText = 'PENDING'
    if (action === 'APPROVED') statusText = 'APPROVED'
    if (action === 'REJECTED') statusText = 'REJECTED'
    if (action === 'REQUEST_INFO') statusText = 'DRAFT'
    if (action === 'SAVE_DRAFT') statusText = 'PENDING' // Keep as pending but save notes

    const updateData: any = { verification_status: statusText }

    const { error } = await supabase.from('venues').update(updateData).eq('id', venue.id)

    if (!error) {
      await logAdminAction(
        `Venue status set to: ${statusText}`,
        'venues',
        venue.id,
        `Verification updated to ${statusText}. Notes: ${adminNotes || 'None'}. Remarks: ${reason || 'None'}`
      )
      showToast(`Review action [${action}] executed successfully!`, 'success')
      fetchApprovals()
      setSelectedVenue(null)
    } else {
      showToast(`Failed to execute review: ${error.message}`, 'error')
    }

    setActionLoading(false)
    setConfirmModal(null)
    setReason('')
  }

  const filteredApprovals = useMemo(() => {
    return approvals.filter((v) => {
      const ownerName = v.owner_profiles?.full_name || ''
      const turfName = v.name || ''
      const query = searchQuery.toLowerCase()
      return ownerName.toLowerCase().includes(query) || turfName.toLowerCase().includes(query)
    })
  }, [approvals, searchQuery])

  // Mock list of gallery images
  const sampleGallery = [
    'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=800',
    'https://images.unsplash.com/photo-1459865264687-595d652de67e?q=80&w=800',
    'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=800',
    'https://images.unsplash.com/photo-1518063319789-7217e6706b04?q=80&w=800',
    'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?q=80&w=800',
  ]

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    showToast(`${label} copied to clipboard!`)
  }

  return (
    <DashboardAnimationWrapper className="p-8 space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-2 p-4 rounded-xl text-sm font-semibold border ${
            toast.type === 'success'
              ? 'bg-green-500/10 border-green-500/20 text-green-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <DashboardAnimationItem className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Owner & Turf Approvals</h1>
          <p className="text-gray-400 text-sm mt-1">
            Review detailed owner submissions and execute verification checks.
          </p>
        </div>
      </DashboardAnimationItem>

      {/* Info & Search */}
      <DashboardAnimationItem className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-amber-500/10 px-3.5 py-1.5 rounded-xl border border-amber-500/20 text-amber-400 text-xs font-semibold w-fit">
          <Clock className="w-4 h-4" />
          {approvals.filter((a) => a.verification_status === 'PENDING').length} Pending Review
        </div>

        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by owner or turf name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50"
          />
        </div>
      </DashboardAnimationItem>

      {/* Table Queue */}
      <DashboardAnimationItem className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            <p className="text-sm">Loading approvals queue...</p>
          </div>
        ) : filteredApprovals.length === 0 ? (
          <div className="text-center py-20 text-gray-500 text-sm">
            No verification requests found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-white/8 bg-white/[0.02] text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Owner Business</th>
                  <th className="px-6 py-4">Turf Name</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Submission Date</th>
                  <th className="px-6 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-gray-200">
                {filteredApprovals.map((v) => (
                  <tr key={v.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-white">
                        {v.owner_profiles?.business_name || 'Individual Owner'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {v.owner_profiles?.full_name || 'N/A'}
                      </p>
                    </td>
                    <td className="px-6 py-4 font-semibold text-white">{v.name}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          v.verification_status === 'APPROVED'
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : v.verification_status === 'REJECTED'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {v.verification_status || 'PENDING'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {v.created_at ? new Date(v.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedVenue(v)
                          setActiveImageIndex(0)
                        }}
                        className="px-3.5 py-1.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg text-xs font-semibold hover:bg-green-500 hover:text-black transition-all"
                      >
                        Verify Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardAnimationItem>

      {/* REVIEW DETAILS MODAL */}
      {selectedVenue && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-40 flex items-center justify-center p-6 overflow-y-auto">
          <style
            dangerouslySetInnerHTML={{
              __html: `
            .transparent-scrollbar::-webkit-scrollbar {
              width: 6px;
              height: 6px;
              background: transparent;
            }
            .transparent-scrollbar::-webkit-scrollbar-track {
              background: transparent;
            }
            .transparent-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(255, 255, 255, 0.15);
              border-radius: 9999px;
            }
            .transparent-scrollbar::-webkit-scrollbar-thumb:hover {
              background: rgba(255, 255, 255, 0.3);
            }
            .transparent-scrollbar {
              scrollbar-width: thin;
              scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
            }
          `,
            }}
          />
          <div className="w-full max-w-5xl bg-[#070c07] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6 max-h-[85vh] overflow-y-auto transparent-scrollbar my-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                  Enterprise Verification Review
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Reviewing Listing ID:{' '}
                  <span className="font-mono text-gray-300">{selectedVenue.id}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedVenue(null)}
                className="px-3 py-1.5 bg-white/5 border border-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-bold transition-all"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Venue Details, Location, pricing, specifications */}
              <div className="lg:col-span-2 space-y-6">
                {/* Section: Venue Information */}
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-bold text-green-400 uppercase tracking-widest flex items-center gap-2">
                    <Building className="w-4 h-4" /> Venue Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-xs text-gray-300">
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                        Turf Name
                      </p>
                      <p className="text-white font-bold mt-0.5">{selectedVenue.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                        Turf Type
                      </p>
                      <p className="text-white font-medium mt-0.5">
                        {selectedVenue.turf_type || 'Artificial Grass'}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                        Description
                      </p>
                      <p className="mt-1 leading-relaxed">
                        {selectedVenue.description || 'No description provided.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section: Location */}
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-bold text-green-400 uppercase tracking-widest flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Location Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-xs text-gray-300">
                    <div className="col-span-2 flex items-start justify-between">
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                          Full Address
                        </p>
                        <p className="text-white font-medium mt-0.5">{selectedVenue.address}</p>
                      </div>
                      <button
                        onClick={() => handleCopyText(selectedVenue.address, 'Address')}
                        className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                        City
                      </p>
                      <p className="text-white font-medium mt-0.5">Hyderabad</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                        State
                      </p>
                      <p className="text-white font-medium mt-0.5">Telangana</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                        Pincode
                      </p>
                      <p className="text-white font-medium mt-0.5">500081</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                        Google Maps Link
                      </p>
                      <a
                        href={selectedVenue.google_maps_link || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="text-green-400 hover:underline inline-flex items-center gap-1 mt-0.5 truncate max-w-full"
                      >
                        Open Maps <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Map Preview */}
                  {selectedVenue.google_maps_link &&
                  selectedVenue.google_maps_link.includes('http') ? (
                    <a
                      href={selectedVenue.google_maps_link}
                      target="_blank"
                      rel="noreferrer"
                      className="h-36 w-full rounded-xl bg-green-950/20 border border-green-500/10 flex items-center justify-center text-xs text-green-400/60 font-semibold gap-2 hover:bg-green-900/30 transition-colors group relative overflow-hidden"
                    >
                      <MapPin className="w-4 h-4 animate-bounce group-hover:text-green-400" />
                      <span className="group-hover:text-green-400">
                        Click to Open in Google Maps
                      </span>
                    </a>
                  ) : (
                    <div className="h-36 w-full rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs text-gray-500 font-semibold gap-2">
                      <MapPin className="w-4 h-4" /> No Map Available
                    </div>
                  )}
                </div>

                {/* Section: Pricing & Operating Hours */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-3.5">
                    <h4 className="text-xs font-bold text-green-400 uppercase tracking-widest">
                      Pricing Structure
                    </h4>
                    <div className="space-y-2 text-xs text-gray-300">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Base Price</span>
                        <span className="font-semibold text-white">
                          ₹
                          {selectedVenue.venue_pricing?.[0]?.price ||
                            selectedVenue.venue_pricing?.price ||
                            0}
                          /hr
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Weekend Price</span>
                        <span className="font-semibold text-white">
                          ₹
                          {selectedVenue.venue_pricing?.[0]?.weekend_price ||
                            selectedVenue.venue_pricing?.weekend_price ||
                            selectedVenue.venue_pricing?.[0]?.price ||
                            selectedVenue.venue_pricing?.price ||
                            0}
                          /hr
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Peak Hour Price</span>
                        <span className="font-semibold text-white">
                          ₹
                          {selectedVenue.venue_pricing?.[0]?.peak_price ||
                            selectedVenue.venue_pricing?.peak_price ||
                            selectedVenue.venue_pricing?.[0]?.price ||
                            selectedVenue.venue_pricing?.price ||
                            0}
                          /hr
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Advance Limit</span>
                        <span className="font-semibold text-white">
                          {selectedVenue.venue_pricing?.[0]?.advance_limit ||
                            selectedVenue.venue_pricing?.advance_limit ||
                            15}{' '}
                          Days
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-3.5">
                    <h4 className="text-xs font-bold text-green-400 uppercase tracking-widest">
                      Operating Times
                    </h4>
                    <div className="space-y-2 text-xs text-gray-300">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Opening Time</span>
                        <span className="font-semibold text-white">
                          {selectedVenue.opening_time
                            ? selectedVenue.opening_time.substring(0, 5)
                            : '06:00'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Closing Time</span>
                        <span className="font-semibold text-white">
                          {selectedVenue.closing_time
                            ? selectedVenue.closing_time.substring(0, 5)
                            : '23:00'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Weekly Holidays</span>
                        <span className="font-semibold text-white">
                          {selectedVenue.weekly_holidays?.length
                            ? selectedVenue.weekly_holidays.join(', ')
                            : 'None'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Slot Duration</span>
                        <span className="font-semibold text-white">
                          {selectedVenue.slot_duration || 60} Mins
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Turf Specifications & Amenities */}
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-bold text-green-400 uppercase tracking-widest">
                    Turf Specifications & Amenities
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-300">
                    <div className="bg-white/5 p-2.5 rounded-xl text-center">
                      <span className="text-gray-500 block text-[9px] uppercase">Size</span>
                      <span className="font-bold text-white">{selectedVenue.size || 'N/A'}</span>
                    </div>
                    <div className="bg-white/5 p-2.5 rounded-xl text-center">
                      <span className="text-gray-500 block text-[9px] uppercase">
                        Indoor/Outdoor
                      </span>
                      <span className="font-bold text-white">
                        {selectedVenue.is_indoor ? 'Indoor' : 'Outdoor'}
                      </span>
                    </div>
                    <div className="bg-white/5 p-2.5 rounded-xl text-center">
                      <span className="text-gray-500 block text-[9px] uppercase">Max Players</span>
                      <span className="font-bold text-white">
                        {selectedVenue.max_players || 14} Players
                      </span>
                    </div>
                    <div className="bg-white/5 p-2.5 rounded-xl text-center">
                      <span className="text-gray-500 block text-[9px] uppercase">Surface</span>
                      <span className="font-bold text-white">
                        {selectedVenue.surface || 'Lawn Turf'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                    {[
                      'Parking Available',
                      'Flood Lights',
                      'Washrooms',
                      'Drinking Water',
                      'Changing Room',
                      'First Aid Kit',
                    ].map((amenity, idx) => {
                      const hasAmenity = selectedVenue.amenities?.includes(amenity)
                      return (
                        <div key={idx} className="flex items-center gap-2 text-xs text-gray-300">
                          {hasAmenity ? (
                            <Check className="w-3.5 h-3.5 text-green-400" />
                          ) : (
                            <span className="text-gray-600">✕</span>
                          )}
                          <span className={hasAmenity ? 'text-white' : 'text-gray-500'}>
                            {amenity}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Section: Turf Gallery */}
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-bold text-green-400 uppercase tracking-widest flex items-center justify-between">
                    <span>
                      Turf Gallery ({Math.min((selectedVenue.venue_images || []).length, 2)} Images)
                    </span>
                    <span className="text-[10px] text-gray-500 lowercase">Click to Zoom</span>
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    {(selectedVenue.venue_images || []).slice(0, 2).map((img: any, idx: number) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setActiveImageIndex(idx)
                          setIsFullscreenImage(true)
                        }}
                        className="relative h-24 rounded-xl overflow-hidden cursor-pointer border border-white/10 hover:border-green-400 transition-all group"
                      >
                        <img
                          src={img.url}
                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                          alt="Turf preview"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                          <ZoomIn className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    ))}
                    {(selectedVenue.venue_images || []).length === 0 && (
                      <div className="col-span-2 py-8 text-center text-xs text-gray-500 border border-white/5 border-dashed rounded-xl bg-white/[0.01]">
                        No images uploaded
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: AI Verification score, Checklist, notes, actions */}
              <div className="space-y-6">
                {/* Section: AI Score Summary */}
                <div className="bg-gradient-to-br from-green-950/20 to-emerald-950/10 border border-green-500/20 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-bold text-green-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> AI Verification Summary
                  </h4>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-white">96%</p>
                      <p className="text-[9px] text-gray-400 uppercase tracking-wider">
                        Verification Score
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                      LOW RISK
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: '96%' }} />
                  </div>

                  <div className="bg-white/5 rounded-xl p-3.5 text-xs text-gray-300 border border-white/5 space-y-2">
                    <p className="font-semibold text-white flex items-center gap-1">
                      🟢 Recommended Action: Approve
                    </p>
                    <p className="text-gray-400 text-[11px] leading-relaxed">
                      All documentation checklists have passed. No duplicate listings or coordinates
                      flags detected on the network.
                    </p>
                  </div>
                </div>

                {/* Section: Categorized Verification Checklist */}
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-bold text-green-400 uppercase tracking-widest flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4" /> Verification Checklist
                  </h4>

                  <div className="space-y-4 text-xs">
                    {/* Category: Identity */}
                    <div className="space-y-2">
                      <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                        Identity
                      </p>
                      <div className="flex justify-between">
                        <span>Email Verified</span>
                        <span className="text-green-400 font-semibold">Passed</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Phone Verified</span>
                        <span className="text-green-400 font-semibold">Passed</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Govt ID Uploaded</span>
                        <span className="text-green-400 font-semibold">Passed</span>
                      </div>
                    </div>

                    {/* Category: Venue */}
                    <div className="space-y-2 border-t border-white/5 pt-3">
                      <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                        Venue
                      </p>
                      <div className="flex justify-between">
                        <span>Turf Images</span>
                        <span className="text-green-400 font-semibold">Passed</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Location Verified</span>
                        <span className="text-green-400 font-semibold">Passed</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Operating Hours</span>
                        <span className="text-green-400 font-semibold">Passed</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Verification Timeline */}
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-bold text-green-400 uppercase tracking-widest flex items-center gap-1.5">
                    <History className="w-4 h-4" /> Review Timeline
                  </h4>

                  <div className="relative pl-5 border-l border-white/10 space-y-4 text-xs">
                    <div className="relative">
                      <div className="absolute -left-[25px] top-0.5 w-2 h-2 rounded-full bg-green-500" />
                      <p className="font-semibold text-white">Owner Registered</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {selectedVenue.owner_profiles?.created_at
                          ? new Date(selectedVenue.owner_profiles.created_at).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[25px] top-0.5 w-2 h-2 rounded-full bg-green-500" />
                      <p className="font-semibold text-white">Documents Uploaded</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {selectedVenue.created_at
                          ? new Date(selectedVenue.created_at).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                    <div className="relative">
                      <div
                        className={`absolute -left-[25px] top-0.5 w-2 h-2 rounded-full ${
                          selectedVenue.verification_status === 'APPROVED'
                            ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'
                            : selectedVenue.verification_status === 'REJECTED'
                              ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                              : selectedVenue.verification_status === 'REQUEST_CHANGES'
                                ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                                : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)] animate-pulse'
                        }`}
                      />
                      <p
                        className={`font-semibold ${
                          selectedVenue.verification_status === 'APPROVED'
                            ? 'text-green-400'
                            : selectedVenue.verification_status === 'REJECTED'
                              ? 'text-red-400'
                              : 'text-amber-500'
                        }`}
                      >
                        {selectedVenue.verification_status === 'APPROVED'
                          ? 'Approved & Live'
                          : selectedVenue.verification_status === 'REJECTED'
                            ? 'Verification Rejected'
                            : selectedVenue.verification_status === 'REQUEST_CHANGES'
                              ? 'Changes Requested'
                              : 'Verification Pending'}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {selectedVenue.verification_status === 'PENDING'
                          ? 'Assigned to Super Admin'
                          : selectedVenue.updated_at
                            ? new Date(selectedVenue.updated_at).toLocaleDateString()
                            : 'Recently updated'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section: Internal Admin Notes */}
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                    Internal Reviewer Notes
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Write internal audit observations (Admin only)..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
                    rows={4}
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions Row */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10">
              <button
                onClick={() => showToast('Submitted documents download started!', 'success')}
                className="px-4 py-2 border border-white/10 hover:bg-white/5 rounded-xl text-xs font-semibold text-gray-300 transition-colors inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Download Docs
              </button>

              <div className="flex gap-2">
                {selectedVenue.verification_status !== 'APPROVED' ? (
                  <>
                    <button
                      onClick={() =>
                        setConfirmModal({ venue: selectedVenue, action: 'SAVE_DRAFT' })
                      }
                      className="px-4 py-2 bg-white/5 border border-white/10 text-gray-300 text-xs font-bold hover:bg-white/10 rounded-xl transition-all"
                    >
                      Save Draft
                    </button>
                    <button
                      onClick={() =>
                        setConfirmModal({ venue: selectedVenue, action: 'REQUEST_INFO' })
                      }
                      className="px-4 py-2 border border-amber-500/20 text-amber-400 text-xs font-bold hover:bg-amber-500/10 rounded-xl transition-all"
                    >
                      Request Changes
                    </button>
                    <button
                      onClick={() => setConfirmModal({ venue: selectedVenue, action: 'REJECTED' })}
                      className="px-4 py-2 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/10 rounded-xl transition-all"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => setConfirmModal({ venue: selectedVenue, action: 'APPROVED' })}
                      className="px-6 py-2 bg-green-500 text-black text-xs font-bold hover:bg-green-400 rounded-xl transition-all"
                    >
                      Approve & Live
                    </button>
                  </>
                ) : (
                  <div className="px-6 py-2 bg-green-500/20 text-green-500 border border-green-500/30 rounded-xl text-xs font-black flex items-center gap-2 cursor-default">
                    <CheckSquare className="w-4 h-4" /> Approved & Live on Platform
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN IMAGE ZOOM VIEWER */}
      {isFullscreenImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setIsFullscreenImage(false)}
        >
          <button className="absolute top-6 right-6 text-white text-lg">✕ Close</button>
          <img
            src={selectedVenue.venue_images?.[activeImageIndex]?.url || ''}
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl border border-white/5"
            alt="Zoom view"
          />
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0c120c] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <CheckSquare className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                Confirm Status Review
              </h3>
            </div>

            <p className="text-sm text-gray-300">
              Set verification status of{' '}
              <strong className="text-white">{confirmModal.venue.name}</strong> to{' '}
              <strong className="text-green-400">{confirmModal.action}</strong>?
            </p>

            {confirmModal.action !== 'SAVE_DRAFT' && (
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400">Remarks (Sent to Owner):</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason remarks..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
                  rows={3}
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                disabled={actionLoading}
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 border border-white/10 rounded-xl text-sm font-semibold text-gray-400 hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading}
                onClick={handleUpdateStatus}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-green-500 text-black hover:bg-green-400 transition-colors flex items-center gap-2"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardAnimationWrapper>
  )
}
