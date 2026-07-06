'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft,
  Building2,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  User,
  IndianRupee,
  Calendar,
  Loader2,
  X,
  ShieldAlert,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

export default function AdminVenueReviewPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [venue, setVenue] = useState<any>(null)
  const [pricing, setPricing] = useState<any>(null)
  const [images, setImages] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    async function fetchDetails() {
      setIsLoading(true)

      const { data: vData } = await supabase
        .from('venues')
        .select(
          `
          *,
          owner_profiles(full_name, business_name, user_id),
          cities(name),
          areas(name)
        `
        )
        .eq('id', id)
        .single()

      if (vData) {
        setVenue(vData)

        // Fetch pricing
        const { data: pData } = await supabase
          .from('venue_pricing')
          .select('*')
          .eq('venue_id', id)
          .single()
        setPricing(pData)

        // Fetch images
        const { data: iData } = await supabase.from('venue_images').select('*').eq('venue_id', id)
        setImages(iData || [])
      }

      setIsLoading(false)
    }

    if (id) fetchDetails()
  }, [id])

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const handleUpdateStatus = async (newStatus: 'APPROVED' | 'REJECTED') => {
    setIsProcessing(true)
    try {
      const { error } = await supabase
        .from('venues')
        .update({ verification_status: newStatus })
        .eq('id', id)

      if (error) throw error

      setVenue((prev: any) => ({ ...prev, verification_status: newStatus }))
      setToast({ message: `Venue successfully ${newStatus.toLowerCase()}.`, type: 'success' })

      // Redirect after a short delay
      setTimeout(() => {
        router.push('/admin/venues')
      }, 2000)
    } catch (e: any) {
      console.error(e)
      setToast({ message: e.message || 'Error updating status', type: 'error' })
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] w-full">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
        <p className="mt-4 text-sm text-gray-400 font-medium tracking-wide animate-pulse">
          Loading venue details...
        </p>
      </div>
    )
  }

  if (!venue) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Venue Not Found</h2>
        <p className="text-gray-400 mb-6">
          The venue you are trying to review does not exist or has been deleted.
        </p>
        <Link href="/admin/venues" className="text-green-400 hover:text-green-300 font-medium">
          ← Back to Venues
        </Link>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <Link
          href="/admin/venues"
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{venue.name}</h1>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                venue.verification_status === 'PENDING'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : venue.verification_status === 'APPROVED'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}
            >
              {venue.verification_status}
            </span>
          </div>
          <p className="text-gray-400 mt-1 flex items-center gap-2 text-sm">
            <Building2 className="w-4 h-4" />{' '}
            {venue.owner_profiles?.business_name || 'Individual Owner'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details (Left Col) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Images Section */}
          <div className="bg-[#0a0f0a] border border-white/8 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Media & Photos</h2>
            {images.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {images.map((img, i) => (
                  <div
                    key={i}
                    className="aspect-video rounded-xl bg-white/5 border border-white/10 overflow-hidden relative"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="Venue" className="w-full h-full object-cover" />
                    {img.is_cover && (
                      <div className="absolute top-2 left-2 px-2 py-1 rounded bg-black/60 backdrop-blur-sm text-[10px] font-bold text-white uppercase tracking-wider">
                        Cover
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-full aspect-video rounded-xl bg-white/5 border border-white/10 border-dashed flex flex-col items-center justify-center text-gray-500">
                <Info className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm font-medium">No images uploaded</p>
              </div>
            )}
          </div>

          {/* Description & Amenities */}
          <div className="bg-[#0a0f0a] border border-white/8 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Venue Information</h2>
            <div className="prose prose-invert prose-sm max-w-none mb-6">
              <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                {venue.description}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-white/10">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Type</p>
                <p className="text-sm font-medium text-white mt-1">{venue.turf_type}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">
                  Pitches
                </p>
                <p className="text-sm font-medium text-white mt-1">{venue.pitches}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">
                  Setting
                </p>
                <p className="text-sm font-medium text-white mt-1">
                  {venue.is_indoor ? 'Indoor' : 'Outdoor'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Info (Right Col) */}
        <div className="space-y-6">
          {/* Location */}
          <div className="bg-[#0a0f0a] border border-white/8 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Location</h2>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">City</p>
                <p className="text-sm font-medium text-white mt-1">{venue.cities?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Area</p>
                <p className="text-sm font-medium text-white mt-1">{venue.areas?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">
                  Full Address
                </p>
                <p className="text-sm font-medium text-white mt-1">{venue.address}</p>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-[#0a0f0a] border border-white/8 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <IndianRupee className="w-5 h-5 text-green-400" />
              <h2 className="text-lg font-semibold text-white">Pricing Strategy</h2>
            </div>
            {pricing ? (
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">
                  Base Rate (Per Hour)
                </p>
                <p className="text-2xl font-bold text-green-400 mt-1">₹{pricing.price}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No pricing configured yet.</p>
            )}
          </div>

          {/* Owner Info */}
          <div className="bg-[#0a0f0a] border border-white/8 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">Owner Details</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-lg font-bold text-white">
                {venue.owner_profiles?.full_name?.charAt(0) || 'O'}
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  {venue.owner_profiles?.full_name || 'Unknown'}
                </p>
                <p className="text-xs text-gray-400">
                  Owner ID: {venue.owner_id?.substring(0, 8)}...
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-400 text-xs">
                <Calendar className="w-4 h-4" />
                Submitted on{' '}
                {venue.created_at
                  ? format(new Date(venue.created_at), 'MMM d, yyyy')
                  : 'Unknown Date'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Action Bar for Pending Venues */}
      {venue.verification_status === 'PENDING' && (
        <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-[#0a0f0a]/90 backdrop-blur-xl border-t border-white/10 p-4 z-50 animate-in slide-in-from-bottom-full duration-300">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-sm font-bold text-white">Review Required</p>
                <p className="text-xs text-gray-400 hidden sm:block">
                  Please verify the details before making a decision.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleUpdateStatus('REJECTED')}
                disabled={isProcessing}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-red-500/20 text-red-400 text-sm font-bold hover:bg-red-500/10 transition-all disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" /> Reject
              </button>
              <button
                onClick={() => handleUpdateStatus('APPROVED')}
                disabled={isProcessing}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-green-500 text-black text-sm font-bold hover:bg-green-400 transition-all shadow-lg shadow-green-900/20 disabled:opacity-50"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Approve Venue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
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
    </div>
  )
}
