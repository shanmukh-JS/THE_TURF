'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2,
  CheckCircle,
  ChevronRight,
  UploadCloud,
  MapPin,
  Settings,
  Camera,
  PartyPopper,
  Check,
  X,
  ShieldCheck,
} from 'lucide-react'
import { submitVenueAction } from '@/app/actions/venue'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const steps = [
  { id: 1, label: 'Basic Info', icon: Building2 },
  { id: 2, label: 'Venue Details', icon: Settings },
  { id: 3, label: 'Upload Images', icon: Camera },
  { id: 4, label: 'Review', icon: ShieldCheck },
]

const availableFacilities = [
  'Parking',
  'Washroom',
  'Drinking Water',
  'Flood Lights',
  'Changing Room',
  'Cafeteria',
  'Equipment Rental',
  'First Aid',
  'Seating Area',
  'CCTV',
  'WiFi',
]

export default function OwnerOnboardingPage() {
  const [step, setStep] = useState(1)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Step 1 State
  const [basicInfo, setBasicInfo] = useState({
    venueName: '',
    ownerName: '',
    mobileNumber: '',
    emailAddress: '',
    city: '',
    address: '',
    mapLocation: '',
    sports: '',
    courts: '',
    operatingHours: '',
  })

  // Step 2 State
  const [venueDetails, setVenueDetails] = useState({
    description: '',
    pricePerHour: '',
  })
  const [facilities, setFacilities] = useState<string[]>([])

  // Step 3 State
  const [images, setImages] = useState<{
    cover: File | null
    ground: File | null
    facility: File | null
  }>({
    cover: null,
    ground: null,
    facility: null,
  })
  const [previews, setPreviews] = useState<{
    cover: string | null
    ground: string | null
    facility: string | null
  }>({
    cover: null,
    ground: null,
    facility: null,
  })

  const handleImageChange = (id: keyof typeof images, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImages((prev) => ({ ...prev, [id]: file }))
      if (previews[id]) URL.revokeObjectURL(previews[id]!)
      const url = URL.createObjectURL(file)
      setPreviews((prev) => ({ ...prev, [id]: url }))
    }
  }

  const removeImage = (id: keyof typeof images) => {
    setImages((prev) => ({ ...prev, [id]: null }))
    if (previews[id]) {
      URL.revokeObjectURL(previews[id]!)
      setPreviews((prev) => ({ ...prev, [id]: null }))
    }
  }

  // Step 4 State
  const [agreed, setAgreed] = useState(false)

  const toggleFacility = (facility: string) => {
    setFacilities((prev) =>
      prev.includes(facility) ? prev.filter((f) => f !== facility) : [...prev, facility]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError('')

    try {
      const formData = new FormData()

      // Basic Info
      formData.append('venueName', basicInfo.venueName)
      formData.append('ownerName', basicInfo.ownerName)
      formData.append('mobileNumber', basicInfo.mobileNumber)
      formData.append('emailAddress', basicInfo.emailAddress)
      formData.append('city', basicInfo.city)
      formData.append('address', basicInfo.address)
      formData.append('mapLocation', basicInfo.mapLocation)
      formData.append('sports', basicInfo.sports)
      formData.append('courts', basicInfo.courts)
      formData.append('operatingHours', basicInfo.operatingHours)

      // Details
      formData.append('description', venueDetails.description)
      formData.append('pricePerHour', venueDetails.pricePerHour)
      formData.append('facilities', JSON.stringify(facilities))

      // Images
      if (images.cover) formData.append('coverImage', images.cover)
      if (images.ground) formData.append('groundImage', images.ground)
      if (images.facility) formData.append('facilityImage', images.facility)

      const result = await submitVenueAction(formData)

      if (result.success) {
        setIsSubmitted(true)
      } else {
        setSubmitError(result.error || 'Something went wrong')
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isStep1Valid =
    basicInfo.venueName &&
    basicInfo.ownerName &&
    basicInfo.mobileNumber &&
    basicInfo.emailAddress &&
    basicInfo.city &&
    basicInfo.address
  const isStep2Valid = venueDetails.pricePerHour
  const isStep3Valid = images.cover && images.ground
  const isStep4Valid = agreed

  if (isSubmitted) {
    return (
      <main className="min-h-[calc(100vh-64px)] bg-[#060d06] flex items-center justify-center p-4 overflow-hidden relative">
        <div className="absolute inset-0 bg-green-500/10 blur-[100px] rounded-full max-w-3xl mx-auto top-1/2 -translate-y-1/2" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-md rounded-3xl border border-green-500/30 bg-black/60 backdrop-blur-2xl p-8 text-center shadow-2xl shadow-green-900/20 relative z-10"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-900/50"
          >
            <PartyPopper className="w-10 h-10 text-white" />
          </motion.div>

          <h1 className="text-3xl font-bold text-white mb-4">🎉 Congratulations!</h1>
          <div className="text-gray-300 mb-8 space-y-4 leading-relaxed">
            <p>Your venue has been submitted successfully.</p>
            <p>Our team will review your venue within 24 hours.</p>
            <p>
              Once approved, your venue will become visible to thousands of players on TRUF GAMING.
            </p>
          </div>

          <Link
            href="/owner"
            className="block w-full py-4 rounded-xl bg-green-500 hover:bg-green-400 text-black font-bold text-lg transition-all shadow-lg shadow-green-900/30"
          >
            Go to Owner Dashboard
          </Link>
        </motion.div>
      </main>
    )
  }

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#060d06] flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-10">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">List Your Venue</h1>
          <p className="text-gray-400 text-sm">
            Join TRUF GAMING and start accepting bookings in minutes.
          </p>
        </div>

        {/* Stepper */}
        <div className="relative flex items-center justify-between px-2">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-white/5 rounded-full z-0" />
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full z-0 transition-all duration-500 ease-in-out"
            style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
          />

          {steps.map((s) => {
            const Icon = s.icon
            const active = step === s.id
            const done = step > s.id

            return (
              <div key={s.id} className="relative z-10 flex flex-col items-center gap-2">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2',
                    done
                      ? 'bg-green-500 border-green-500 text-black'
                      : active
                        ? 'bg-black border-green-500 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                        : 'bg-black border-white/10 text-gray-500'
                  )}
                >
                  {done ? <Check className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium absolute -bottom-6 w-24 text-center transition-colors',
                    active ? 'text-white' : done ? 'text-gray-300' : 'text-gray-600'
                  )}
                >
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Form Container */}
        <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-black/50 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {/* STEP 1 */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="space-y-1 mb-8">
                  <h2 className="text-xl font-bold text-white">Basic Information</h2>
                  <p className="text-sm text-gray-400">
                    Tell us about your venue and how to reach you.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Venue Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Olympia Sports Arena"
                      value={basicInfo.venueName}
                      onChange={(e) => setBasicInfo({ ...basicInfo, venueName: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3.5 text-white outline-none placeholder:text-gray-600 focus:border-green-500/50 focus:bg-white/[0.03] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Owner Full Name *
                    </label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={basicInfo.ownerName}
                      onChange={(e) => setBasicInfo({ ...basicInfo, ownerName: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3.5 text-white outline-none placeholder:text-gray-600 focus:border-green-500/50 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Mobile Number *
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={basicInfo.mobileNumber}
                      onChange={(e) => setBasicInfo({ ...basicInfo, mobileNumber: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3.5 text-white outline-none placeholder:text-gray-600 focus:border-green-500/50 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      placeholder="contact@venue.com"
                      value={basicInfo.emailAddress}
                      onChange={(e) => setBasicInfo({ ...basicInfo, emailAddress: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3.5 text-white outline-none placeholder:text-gray-600 focus:border-green-500/50 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">City *</label>
                    <input
                      type="text"
                      placeholder="Mumbai"
                      value={basicInfo.city}
                      onChange={(e) => setBasicInfo({ ...basicInfo, city: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3.5 text-white outline-none placeholder:text-gray-600 focus:border-green-500/50 transition-all"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Complete Venue Address *
                    </label>
                    <textarea
                      placeholder="Enter full street address"
                      rows={2}
                      value={basicInfo.address}
                      onChange={(e) => setBasicInfo({ ...basicInfo, address: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3.5 text-white outline-none placeholder:text-gray-600 focus:border-green-500/50 transition-all resize-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-green-400" /> Google Maps Link (Optional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://maps.google.com/..."
                      value={basicInfo.mapLocation}
                      onChange={(e) => setBasicInfo({ ...basicInfo, mapLocation: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3.5 text-white outline-none placeholder:text-gray-600 focus:border-green-500/50 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Sports Available
                    </label>
                    <input
                      type="text"
                      placeholder="Cricket, Football, Tennis..."
                      value={basicInfo.sports}
                      onChange={(e) => setBasicInfo({ ...basicInfo, sports: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3.5 text-white outline-none placeholder:text-gray-600 focus:border-green-500/50 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Number of Grounds/Courts
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 2"
                      value={basicInfo.courts}
                      onChange={(e) => setBasicInfo({ ...basicInfo, courts: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3.5 text-white outline-none placeholder:text-gray-600 focus:border-green-500/50 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Operating Hours
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 6:00 AM - 11:00 PM"
                      value={basicInfo.operatingHours}
                      onChange={(e) =>
                        setBasicInfo({ ...basicInfo, operatingHours: e.target.value })
                      }
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3.5 text-white outline-none placeholder:text-gray-600 focus:border-green-500/50 transition-all"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    disabled={!isStep1Valid}
                    onClick={() => setStep(2)}
                    className="w-full py-4 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-40 disabled:hover:bg-green-500 text-black font-bold text-lg transition-all flex items-center justify-center gap-2"
                  >
                    Continue <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="space-y-1 mb-8">
                  <h2 className="text-xl font-bold text-white">Venue Details & Pricing</h2>
                  <p className="text-sm text-gray-400">
                    Set your pricing and highlight your amenities.
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Venue Description
                    </label>
                    <textarea
                      placeholder="Describe your turf, pitch quality, and overall vibe..."
                      rows={3}
                      value={venueDetails.description}
                      onChange={(e) =>
                        setVenueDetails({ ...venueDetails, description: e.target.value })
                      }
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3.5 text-white outline-none placeholder:text-gray-600 focus:border-green-500/50 transition-all resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Default Price per Hour (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        ₹
                      </span>
                      <input
                        type="number"
                        placeholder="1200"
                        value={venueDetails.pricePerHour}
                        onChange={(e) =>
                          setVenueDetails({ ...venueDetails, pricePerHour: e.target.value })
                        }
                        className="w-full bg-black/50 border border-white/10 rounded-xl pl-9 pr-4 py-3.5 text-white outline-none placeholder:text-gray-600 focus:border-green-500/50 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-4">
                      Available Facilities
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {availableFacilities.map((facility) => {
                        const isSelected = facilities.includes(facility)
                        return (
                          <button
                            key={facility}
                            onClick={() => toggleFacility(facility)}
                            className={cn(
                              'px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 flex items-center gap-2',
                              isSelected
                                ? 'bg-green-500/20 border-green-500/50 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                                : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300'
                            )}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                            {facility}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex gap-4">
                  <button
                    onClick={() => setStep(1)}
                    className="px-6 py-4 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 transition-colors font-medium"
                  >
                    Back
                  </button>
                  <button
                    disabled={!isStep2Valid}
                    onClick={() => setStep(3)}
                    className="flex-1 py-4 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-40 disabled:hover:bg-green-500 text-black font-bold text-lg transition-all flex items-center justify-center gap-2"
                  >
                    Continue <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="space-y-1 mb-8">
                  <h2 className="text-xl font-bold text-white">Upload Images</h2>
                  <p className="text-sm text-gray-400">
                    Great photos get more bookings. Upload high-quality images.
                  </p>
                </div>

                <div className="space-y-6">
                  {[
                    {
                      id: 'cover',
                      label: 'Venue Cover Image *',
                      desc: 'Main image shown on search results',
                    },
                    {
                      id: 'ground',
                      label: 'Ground Photos *',
                      desc: 'Show the playing surface and nets',
                    },
                    {
                      id: 'facility',
                      label: 'Facility Photos (Optional)',
                      desc: 'Show parking, washrooms, seating',
                    },
                  ].map((upload) => {
                    const isUploaded = !!images[upload.id as keyof typeof images]
                    const previewUrl = previews[upload.id as keyof typeof previews]
                    return (
                      <div key={upload.id}>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          {upload.label}
                        </label>
                        <p className="text-xs text-gray-500 mb-3">{upload.desc}</p>

                        {isUploaded && previewUrl ? (
                          <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-white/10 group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={previewUrl}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                onClick={() => removeImage(upload.id as keyof typeof images)}
                                className="px-4 py-2 bg-red-500/90 hover:bg-red-500 text-white text-sm font-medium rounded-xl flex items-center gap-2 transition-all shadow-xl"
                              >
                                <X className="w-4 h-4" /> Remove Image
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="w-full rounded-2xl border-2 border-dashed border-white/10 bg-black/40 hover:border-green-500/30 hover:bg-white/[0.03] transition-all duration-300 cursor-pointer flex flex-col items-center justify-center p-8">
                            <input
                              type="file"
                              className="hidden"
                              accept="image/png, image/jpeg, image/webp"
                              onChange={(e) =>
                                handleImageChange(upload.id as keyof typeof images, e)
                              }
                            />
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:bg-white/10 transition-colors">
                              <UploadCloud className="w-6 h-6 text-gray-400" />
                            </div>
                            <span className="text-gray-300 font-medium text-sm">
                              Click to browse or drag image here
                            </span>
                            <span className="text-gray-600 text-xs mt-1">
                              Supports JPG, PNG, WEBP (Max 5MB)
                            </span>
                          </label>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="pt-6 flex gap-4">
                  <button
                    onClick={() => setStep(2)}
                    className="px-6 py-4 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 transition-colors font-medium"
                  >
                    Back
                  </button>
                  <button
                    disabled={!isStep3Valid}
                    onClick={() => setStep(4)}
                    className="flex-1 py-4 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-40 disabled:hover:bg-green-500 text-black font-bold text-lg transition-all flex items-center justify-center gap-2"
                  >
                    Continue <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 4 */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="space-y-1 mb-6">
                  <h2 className="text-xl font-bold text-white">Review & Submit</h2>
                  <p className="text-sm text-gray-400">
                    Please review your venue details before submitting.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/40 p-6 space-y-6">
                  <div>
                    <h3 className="text-sm text-gray-500 font-medium mb-3 uppercase tracking-wider">
                      Business Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Venue Name</p>
                        <p className="text-sm text-white font-medium">{basicInfo.venueName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Owner Name</p>
                        <p className="text-sm text-white font-medium">{basicInfo.ownerName}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500">Address</p>
                        <p className="text-sm text-white font-medium">
                          {basicInfo.address}, {basicInfo.city}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="h-px w-full bg-white/10" />

                  <div>
                    <h3 className="text-sm text-gray-500 font-medium mb-3 uppercase tracking-wider">
                      Venue Details
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Price / Hour</p>
                        <p className="text-sm text-green-400 font-bold">
                          ₹{venueDetails.pricePerHour}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 mb-1.5">Facilities</p>
                        <div className="flex flex-wrap gap-2">
                          {facilities.length > 0 ? (
                            facilities.map((f) => (
                              <span
                                key={f}
                                className="px-2 py-1 rounded-md bg-white/5 text-xs text-gray-300 border border-white/10"
                              >
                                {f}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-gray-500">None selected</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div
                      className={cn(
                        'w-5 h-5 rounded border flex items-center justify-center mt-0.5 transition-all flex-shrink-0',
                        agreed
                          ? 'bg-green-500 border-green-500 text-black'
                          : 'border-gray-600 group-hover:border-green-500/50 text-transparent'
                      )}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                    />
                    <span className="text-sm text-gray-400 leading-relaxed select-none">
                      I agree to the{' '}
                      <Link
                        href="/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-400 hover:underline"
                      >
                        Terms & Conditions
                      </Link>{' '}
                      and confirm that the information provided is accurate.
                    </span>
                  </label>
                </div>

                {submitError && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
                    {submitError}
                  </div>
                )}

                <div className="pt-6 flex gap-4">
                  <button
                    onClick={() => setStep(3)}
                    className="px-6 py-4 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 transition-colors font-medium"
                  >
                    Back
                  </button>
                  <button
                    disabled={!isStep4Valid || isSubmitting}
                    onClick={handleSubmit}
                    className="flex-1 py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 disabled:opacity-40 text-black font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-900/30"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Venue'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  )
}
