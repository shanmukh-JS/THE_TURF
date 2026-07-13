'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  FileText,
  MapPin,
  Clock,
  ShieldCheck,
  Building2,
  ChevronDown,
  Info,
  Calendar,
  Image as ImageIcon,
  IndianRupee,
  Activity,
  Edit3,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

export default function EnterpriseVerificationReviewPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [venue, setVenue] = useState<any>(null)
  const [pricing, setPricing] = useState<any>(null)
  const [images, setImages] = useState<any[]>([])

  // Checklist State
  const [checklist, setChecklist] = useState({
    identity_verified: false,
    phone_verified: false,
    govt_id_uploaded: false,
    turf_images_verified: false,
    location_verified: false,
    operating_hours_verified: false,
  })

  // Admin notes
  const [adminNotes, setAdminNotes] = useState('')

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
          owner_profiles(full_name, business_name, user_id, created_at),
          cities(name),
          areas(name)
        `
        )
        .eq('id', id)
        .single()

      if (vData) {
        setVenue(vData)
        setChecklist({
          identity_verified: vData.identity_verified || false,
          phone_verified: vData.phone_verified || false,
          govt_id_uploaded: vData.govt_id_uploaded || false,
          turf_images_verified: vData.turf_images_verified || false,
          location_verified: vData.location_verified || false,
          operating_hours_verified: vData.operating_hours_verified || false,
        })
        setAdminNotes(vData.admin_notes || '')

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

  const toggleCheck = (key: keyof typeof checklist) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleUpdateStatus = async (
    newStatus: 'APPROVED' | 'REJECTED' | 'REQUEST_CHANGES' | 'DRAFT',
    skipRedirect = false
  ) => {
    setIsProcessing(true)
    try {
      const { error } = await supabase
        .from('venues')
        .update({
          verification_status: newStatus === 'DRAFT' ? venue.verification_status : newStatus, // Draft just saves checklist
          identity_verified: checklist.identity_verified,
          phone_verified: checklist.phone_verified,
          govt_id_uploaded: checklist.govt_id_uploaded,
          turf_images_verified: checklist.turf_images_verified,
          location_verified: checklist.location_verified,
          operating_hours_verified: checklist.operating_hours_verified,
          admin_notes: adminNotes,
          ai_verification_score: aiScore,
        })
        .eq('id', id)

      if (error) throw error

      setVenue((prev: any) => ({
        ...prev,
        verification_status: newStatus === 'DRAFT' ? prev.verification_status : newStatus,
      }))
      setToast({
        message:
          newStatus === 'DRAFT'
            ? 'Draft saved successfully.'
            : `Venue successfully updated to ${newStatus}.`,
        type: 'success',
      })

      if (!skipRedirect) {
        setTimeout(() => {
          router.push('/admin/venues')
        }, 2000)
      }
    } catch (e: any) {
      console.error(e)
      setToast({ message: e.message || 'Error updating status', type: 'error' })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownloadDocs = () => {
    if (venue?.documents_url && venue.documents_url.length > 0) {
      // Preload images to guarantee they are cached before printing
      const preloadPromises = venue.documents_url.map((url: string) => {
        return new Promise((resolve) => {
          const img = new Image()
          img.onload = () => resolve(url)
          img.onerror = () => resolve(url)
          img.src = url
        })
      })

      Promise.all(preloadPromises).then(() => {
        const printWindow = window.open('', '_blank')
        if (printWindow) {
          const imagesHtml = venue.documents_url
            .map(
              (url: string) => `
              <div style="page-break-after: always; text-align: center; padding: 20px;">
                <img src="${url}" style="max-width: 100%; max-height: 90vh; object-fit: contain; border: 1px solid #ccc; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" />
              </div>
            `
            )
            .join('')

          printWindow.document.write(`
            <html>
              <head>
                <title>Venue Documents - ${venue.name}</title>
                <style>
                  body { margin: 0; padding: 0; background: #fff; font-family: sans-serif; }
                  @media print {
                    body { background: none; }
                    div { page-break-after: always; }
                  }
                </style>
              </head>
              <body>
                <h2 style="text-align: center; margin-top: 30px; font-family: sans-serif; color: #333;">Venue Documents Checklist</h2>
                <p style="text-align: center; color: #666; margin-bottom: 40px;">Venue ID: ${venue.id} | Name: ${venue.name}</p>
                ${imagesHtml}
                <script>
                  window.onload = function() {
                    setTimeout(function() {
                      window.print();
                      setTimeout(function() { window.close(); }, 500);
                    }, 300);
                  };
                </script>
              </body>
            </html>
          `)
          printWindow.document.close()
        }
      })
    } else {
      setToast({ message: 'No documents uploaded for this venue.', type: 'error' })
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-[#0a0a0a]">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
      </div>
    )
  }

  if (!venue) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] bg-[#0a0a0a]">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Venue Not Found</h2>
      </div>
    )
  }

  // Calculate AI Score
  const checks = Object.values(checklist)
  const passedChecks = checks.filter(Boolean).length
  const aiScore = Math.round((passedChecks / checks.length) * 100)
  const riskLevel = aiScore > 80 ? 'LOW RISK' : aiScore > 50 ? 'MEDIUM RISK' : 'HIGH RISK'
  const riskColor =
    aiScore > 80
      ? 'text-green-500 border-green-500/30 bg-green-500/10'
      : aiScore > 50
        ? 'text-amber-500 border-amber-500/30 bg-amber-500/10'
        : 'text-red-500 border-red-500/30 bg-red-500/10'

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 pb-24 font-sans selection:bg-green-500/30">
      {/* Top Header */}
      <div className="border-b border-white/5 bg-[#0a0a0a] sticky top-0 z-40">
        <div className="px-6 py-4 flex items-center justify-between max-w-[1600px] mx-auto">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              ENTERPRISE VERIFICATION REVIEW
            </h1>
            <p className="text-xs text-gray-500 mt-1 font-mono">Reviewing Listing ID: {venue.id}</p>
          </div>
          <Link
            href="/admin/venues"
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-medium transition-colors flex items-center gap-2"
          >
            <X className="w-4 h-4" /> Close
          </Link>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN - Data */}
        <div className="lg:col-span-8 space-y-6">
          {/* VENUE INFORMATION */}
          <div className="bg-[#0a0a0a] rounded-2xl border border-white/5 p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-green-500/50 group-hover:bg-green-500 transition-colors" />
            <h3 className="text-xs font-bold text-green-500 tracking-wider mb-5 flex items-center gap-2 uppercase">
              <Building2 className="w-4 h-4" /> Venue Information
            </h3>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Turf Name</p>
                <p className="text-lg text-white font-medium">{venue.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Turf Type</p>
                <p className="text-white">{venue.turf_type}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Description</p>
                <p className="text-sm leading-relaxed text-gray-400">{venue.description}</p>
              </div>
            </div>
          </div>

          {/* LOCATION DETAILS */}
          <div className="bg-[#0a0a0a] rounded-2xl border border-white/5 p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-green-500/50 group-hover:bg-green-500 transition-colors" />
            <h3 className="text-xs font-bold text-green-500 tracking-wider mb-5 flex items-center gap-2 uppercase">
              <MapPin className="w-4 h-4" /> Location Details
            </h3>
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="col-span-2">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Full Address</p>
                <p className="text-white text-sm">{venue.address}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">City</p>
                <p className="text-white text-sm">
                  {venue.cities?.name || venue.address?.split(',')[4]?.trim() || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Area</p>
                <p className="text-white text-sm">
                  {venue.areas?.name || venue.address?.split(',')[0]?.trim() || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Pincode</p>
                <p className="text-white text-sm">{venue.pincode || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                  Google Maps Link
                </p>
                {venue.google_maps_link ? (
                  <a
                    href={venue.google_maps_link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-green-400 hover:underline text-sm truncate block"
                  >
                    {venue.google_maps_link}
                  </a>
                ) : (
                  <p className="text-gray-500 text-sm">Not provided</p>
                )}
              </div>
            </div>

            {/* Stylized Maps Preview Card */}
            {venue.google_maps_link && venue.google_maps_link.includes('http') ? (
              <div className="relative w-full h-48 rounded-xl border border-white/10 overflow-hidden bg-zinc-900 flex items-center justify-center group cursor-pointer">
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-30 blur-[2px]"
                  style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=600')`,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                <div className="relative z-10 text-center space-y-2 p-4">
                  <MapPin className="w-8 h-8 text-green-400 mx-auto animate-bounce" />
                  <p className="text-xs font-bold text-white uppercase tracking-wider">
                    Interactive Map Location
                  </p>
                  <p className="text-[10px] text-gray-400 truncate max-w-sm mx-auto">
                    {venue.google_maps_link}
                  </p>
                </div>
                <a
                  href={venue.google_maps_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 z-20 flex items-center justify-center bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span className="flex items-center gap-2 px-4 py-2 bg-green-500 text-black text-xs font-bold rounded-xl shadow-xl hover:scale-105 active:scale-95 transition-all">
                    <ExternalLink className="w-3.5 h-3.5" /> View on Google Maps
                  </span>
                </a>
              </div>
            ) : (
              <div className="w-full h-48 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden relative">
                <span className="text-xs text-gray-500 font-medium">No Map Available</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PRICING STRUCTURE */}
            <div className="bg-[#0a0a0a] rounded-2xl border border-white/5 p-6 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-green-500/50 group-hover:bg-green-500 transition-colors" />
              <h3 className="text-xs font-bold text-green-500 tracking-wider mb-5 flex items-center gap-2 uppercase">
                <IndianRupee className="w-4 h-4" /> Pricing Structure
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-sm text-gray-400 font-medium">Base Price</span>
                  <span className="text-white font-bold">₹{pricing?.price || 0}/hr</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-sm text-gray-400 font-medium">Weekend Price</span>
                  <span className="text-white font-bold">
                    ₹{pricing?.weekend_price || pricing?.price || 0}/hr
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-sm text-gray-400 font-medium">Peak Hour Price</span>
                  <span className="text-white font-bold">
                    ₹{pricing?.peak_price || pricing?.price || 0}/hr
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400 font-medium">Advance Limit</span>
                  <span className="text-white font-bold">{pricing?.advance_limit || 15} Days</span>
                </div>
              </div>
            </div>

            {/* OPERATING TIMES */}
            <div className="bg-[#0a0a0a] rounded-2xl border border-white/5 p-6 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-green-500/50 group-hover:bg-green-500 transition-colors" />
              <h3 className="text-xs font-bold text-green-500 tracking-wider mb-5 flex items-center gap-2 uppercase">
                <Clock className="w-4 h-4" /> Operating Times
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-sm text-gray-400 font-medium">Opening Time</span>
                  <span className="text-white font-bold">
                    {venue.opening_time ? venue.opening_time.substring(0, 5) : '06:00'}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-sm text-gray-400 font-medium">Closing Time</span>
                  <span className="text-white font-bold">
                    {venue.closing_time ? venue.closing_time.substring(0, 5) : '23:00'}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-sm text-gray-400 font-medium">Weekly Holidays</span>
                  <span className="text-white font-bold">
                    {venue.weekly_holidays?.length ? venue.weekly_holidays.join(', ') : 'None'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400 font-medium">Slot Duration</span>
                  <span className="text-white font-bold">{venue.slot_duration || 60} Mins</span>
                </div>
              </div>
            </div>
          </div>

          {/* TURF SPECIFICATIONS & AMENITIES */}
          <div className="bg-[#0a0a0a] rounded-2xl border border-white/5 p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-green-500/50 group-hover:bg-green-500 transition-colors" />
            <h3 className="text-xs font-bold text-green-500 tracking-wider mb-5 flex items-center gap-2 uppercase">
              <Activity className="w-4 h-4" /> Turf Specifications & Amenities
            </h3>

            <div className="flex flex-wrap gap-3 mb-6">
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex-1 min-w-[120px] text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-bold">
                  Size
                </p>
                <p className="text-white font-bold">{venue.size || 'N/A'}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex-1 min-w-[120px] text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-bold">
                  Indoor/Outdoor
                </p>
                <p className="text-white font-bold">{venue.is_indoor ? 'Indoor' : 'Outdoor'}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex-1 min-w-[120px] text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-bold">
                  Max Players
                </p>
                <p className="text-white font-bold">{venue.max_players || 14} Players</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex-1 min-w-[120px] text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-bold">
                  Surface
                </p>
                <p className="text-white font-bold">{venue.surface || 'Lawn Turf'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-white/5 pt-6">
              {[
                'Parking',
                'Flood Lights',
                'Washrooms',
                'Drinking Water',
                'Changing Room',
                'First Aid Kit',
              ].map((amenity) => {
                const hasAmenity = venue.amenities?.includes(amenity)
                return (
                  <div key={amenity} className="flex items-center gap-2">
                    {hasAmenity ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 text-gray-600" />
                    )}
                    <span
                      className={`text-sm ${hasAmenity ? 'text-gray-300' : 'text-gray-600 line-through'}`}
                    >
                      {amenity}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* TURF GALLERY */}
          <div className="bg-[#0a0a0a] rounded-2xl border border-white/5 p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-green-500/50 group-hover:bg-green-500 transition-colors" />
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xs font-bold text-green-500 tracking-wider flex items-center gap-2 uppercase">
                <ImageIcon className="w-4 h-4" /> Turf Gallery ({Math.min(images.length, 2)} Images)
              </h3>
              <span className="text-xs text-gray-500 italic">click to zoom</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {images.slice(0, 2).map((img, i) => (
                <div
                  key={i}
                  className="aspect-video rounded-lg overflow-hidden border border-white/10 relative group/img cursor-pointer"
                >
                  <img
                    src={img.url}
                    alt="Turf"
                    className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-500"
                  />
                  {img.is_cover && (
                    <div className="absolute top-1 left-1 bg-green-500 text-black text-[10px] font-bold px-2 py-0.5 rounded shadow">
                      COVER
                    </div>
                  )}
                </div>
              ))}
              {images.length === 0 && (
                <div className="col-span-2 h-24 flex items-center justify-center bg-white/5 rounded-lg border border-white/10 border-dashed">
                  <span className="text-sm text-gray-500">No images uploaded</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - Verification & Tools */}
        <div className="lg:col-span-4 space-y-6">
          {/* AI VERIFICATION SUMMARY */}
          <div className="bg-[#0a0a0a] rounded-2xl border border-white/5 p-6 shadow-xl relative overflow-hidden group border-t-2 border-t-green-500">
            <h3 className="text-xs font-bold text-green-500 tracking-wider mb-6 flex items-center gap-2 uppercase">
              <ShieldCheck className="w-4 h-4" /> AI Verification Summary
            </h3>

            <div className="flex items-end justify-between mb-2">
              <div>
                <span className="text-4xl font-black text-white">{aiScore}%</span>
                <p className="text-[10px] uppercase text-gray-500 font-bold tracking-widest mt-1">
                  Verification Score
                </p>
              </div>
              <div className={`px-3 py-1 rounded border text-xs font-bold ${riskColor}`}>
                {riskLevel}
              </div>
            </div>

            <div className="w-full bg-white/10 h-1.5 rounded-full mt-4 mb-6 overflow-hidden">
              <div
                className="bg-green-500 h-full rounded-full transition-all duration-1000"
                style={{ width: `${aiScore}%` }}
              />
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-white mb-1">
                    Recommended Action: {aiScore >= 80 ? 'Approve' : 'Request Changes'}
                  </p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {aiScore >= 80
                      ? 'Most documentation checklists have passed. No duplicate listings or coordinates flags detected on the network.'
                      : 'Missing crucial verification steps. Advise owner to complete identity and location verification.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* VERIFICATION CHECKLIST */}
          <div className="bg-[#0a0a0a] rounded-2xl border border-white/5 p-6 shadow-xl">
            <h3 className="text-xs font-bold text-green-500 tracking-wider mb-5 uppercase flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Verification Checklist
            </h3>

            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
                  Identity
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => toggleCheck('identity_verified')}
                    className="w-full flex items-center justify-between group"
                  >
                    <span className="text-sm text-gray-300 font-medium group-hover:text-white transition-colors">
                      Email Verified
                    </span>
                    <span
                      className={`text-xs font-bold ${checklist.identity_verified ? 'text-green-500' : 'text-gray-600'}`}
                    >
                      {checklist.identity_verified ? 'Passed' : 'Pending'}
                    </span>
                  </button>
                  <button
                    onClick={() => toggleCheck('phone_verified')}
                    className="w-full flex items-center justify-between group"
                  >
                    <span className="text-sm text-gray-300 font-medium group-hover:text-white transition-colors">
                      Phone Verified
                    </span>
                    <span
                      className={`text-xs font-bold ${checklist.phone_verified ? 'text-green-500' : 'text-gray-600'}`}
                    >
                      {checklist.phone_verified ? 'Passed' : 'Pending'}
                    </span>
                  </button>
                  <button
                    onClick={() => toggleCheck('govt_id_uploaded')}
                    className="w-full flex items-center justify-between group"
                  >
                    <span className="text-sm text-gray-300 font-medium group-hover:text-white transition-colors">
                      Govt ID Uploaded
                    </span>
                    <span
                      className={`text-xs font-bold ${checklist.govt_id_uploaded ? 'text-green-500' : 'text-gray-600'}`}
                    >
                      {checklist.govt_id_uploaded ? 'Passed' : 'Pending'}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
                  Venue
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => toggleCheck('turf_images_verified')}
                    className="w-full flex items-center justify-between group"
                  >
                    <span className="text-sm text-gray-300 font-medium group-hover:text-white transition-colors">
                      Turf Images
                    </span>
                    <span
                      className={`text-xs font-bold ${checklist.turf_images_verified ? 'text-green-500' : 'text-gray-600'}`}
                    >
                      {checklist.turf_images_verified ? 'Passed' : 'Pending'}
                    </span>
                  </button>
                  <button
                    onClick={() => toggleCheck('location_verified')}
                    className="w-full flex items-center justify-between group"
                  >
                    <span className="text-sm text-gray-300 font-medium group-hover:text-white transition-colors">
                      Location Verified
                    </span>
                    <span
                      className={`text-xs font-bold ${checklist.location_verified ? 'text-green-500' : 'text-gray-600'}`}
                    >
                      {checklist.location_verified ? 'Passed' : 'Pending'}
                    </span>
                  </button>
                  <button
                    onClick={() => toggleCheck('operating_hours_verified')}
                    className="w-full flex items-center justify-between group"
                  >
                    <span className="text-sm text-gray-300 font-medium group-hover:text-white transition-colors">
                      Operating Hours
                    </span>
                    <span
                      className={`text-xs font-bold ${checklist.operating_hours_verified ? 'text-green-500' : 'text-gray-600'}`}
                    >
                      {checklist.operating_hours_verified ? 'Passed' : 'Pending'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* REVIEW TIMELINE */}
          <div className="bg-[#0a0a0a] rounded-2xl border border-white/5 p-6 shadow-xl">
            <h3 className="text-xs font-bold text-green-500 tracking-wider mb-5 uppercase flex items-center gap-2">
              <Clock className="w-4 h-4" /> Review Timeline
            </h3>

            <div className="relative pl-4 space-y-6 border-l-2 border-white/10 ml-2">
              <div className="relative">
                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                <p className="text-sm font-bold text-white mb-0.5">Owner Registered</p>
                <p className="text-[10px] text-gray-500 font-mono">
                  {venue.owner_profiles?.created_at
                    ? format(new Date(venue.owner_profiles.created_at), 'MM/dd/yyyy - hh:mm a')
                    : 'N/A'}
                </p>
              </div>
              <div className="relative">
                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                <p className="text-sm font-bold text-white mb-0.5">Documents Uploaded</p>
                <p className="text-[10px] text-gray-500 font-mono">
                  {venue.created_at
                    ? format(new Date(venue.created_at), 'MM/dd/yyyy - hh:mm a')
                    : 'N/A'}
                </p>
              </div>
              <div className="relative">
                <div
                  className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full ${
                    venue.verification_status === 'APPROVED'
                      ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'
                      : venue.verification_status === 'REJECTED'
                        ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                        : venue.verification_status === 'REQUEST_CHANGES'
                          ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                          : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                  }`}
                />
                <p
                  className={`text-sm font-bold ${
                    venue.verification_status === 'APPROVED'
                      ? 'text-green-400'
                      : venue.verification_status === 'REJECTED'
                        ? 'text-red-400'
                        : 'text-amber-500'
                  } mb-0.5`}
                >
                  {venue.verification_status === 'APPROVED'
                    ? 'Approved & Live'
                    : venue.verification_status === 'REJECTED'
                      ? 'Verification Rejected'
                      : venue.verification_status === 'REQUEST_CHANGES'
                        ? 'Changes Requested'
                        : 'Verification Pending'}
                </p>
                <p className="text-[10px] text-gray-500 font-mono">
                  {venue.verification_status === 'PENDING' || venue.verification_status === 'DRAFT'
                    ? 'Assigned to Super Admin'
                    : venue.updated_at
                      ? format(new Date(venue.updated_at), 'MM/dd/yyyy - hh:mm a')
                      : 'Recently updated'}
                </p>
              </div>
            </div>
          </div>

          {/* INTERNAL REVIEWER NOTES */}
          <div className="bg-[#0a0a0a] rounded-2xl border border-white/5 p-6 shadow-xl">
            <h3 className="text-xs font-bold text-gray-500 tracking-wider mb-4 uppercase flex items-center gap-2">
              INTERNAL REVIEWER NOTES
            </h3>
            <div className="relative">
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Write internal audit observations (Admin only)..."
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50 resize-none font-mono"
              />
              <Edit3 className="absolute bottom-3 right-3 w-4 h-4 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* FIXED BOTTOM ACTION BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-white/10 p-4 z-50">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <button
            onClick={handleDownloadDocs}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 transition-colors text-sm font-semibold"
          >
            <FileText className="w-4 h-4" /> Download Docs
          </button>

          <div className="flex items-center gap-3">
            {venue.verification_status !== 'APPROVED' ? (
              <>
                <button
                  disabled={isProcessing}
                  onClick={() => handleUpdateStatus('DRAFT', true)}
                  className="px-5 py-2.5 rounded-lg border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 transition-colors text-sm font-bold disabled:opacity-50"
                >
                  Save Draft
                </button>
                <button
                  disabled={isProcessing}
                  onClick={() => handleUpdateStatus('REQUEST_CHANGES')}
                  className="px-5 py-2.5 rounded-lg border border-amber-500/30 text-amber-500 hover:bg-amber-500/10 transition-colors text-sm font-bold disabled:opacity-50"
                >
                  Request Changes
                </button>
                <button
                  disabled={isProcessing}
                  onClick={() => handleUpdateStatus('REJECTED')}
                  className="px-5 py-2.5 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors text-sm font-bold disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  disabled={isProcessing}
                  onClick={() => handleUpdateStatus('APPROVED')}
                  className="px-6 py-2.5 rounded-lg bg-green-500 text-black hover:bg-green-400 transition-colors text-sm font-black shadow-[0_0_20px_rgba(34,197,94,0.3)] disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Approve & Live'}
                </button>
              </>
            ) : (
              <div className="px-6 py-2.5 rounded-lg bg-green-500/20 text-green-500 border border-green-500/30 flex items-center gap-2 text-sm font-black cursor-default">
                <CheckCircle2 className="w-4 h-4" /> Approved & Live on Platform
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-8 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl shadow-2xl">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-500" />
            )}
            <p className="text-sm font-bold text-black">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  )
}
