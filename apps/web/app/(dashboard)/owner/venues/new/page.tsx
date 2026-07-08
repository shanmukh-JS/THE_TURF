'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  MapPin,
  Info,
  IndianRupee,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Upload,
  ArrowRight,
  ArrowLeft,
  X,
  Loader2,
} from 'lucide-react'

// Steps
const STEPS = [
  { id: 1, title: 'Basic Details', icon: Info },
  { id: 2, title: 'Location', icon: MapPin },
  { id: 3, title: 'Pricing & Media', icon: IndianRupee },
  { id: 4, title: 'Verification', icon: Upload },
]

export default function NewVenuePage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploading, setUploading] = useState<false | 'cover' | 'additional'>(false)
  const [docUploading, setDocUploading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null)
  const activeInputRef = useRef<'cover' | 'additional'>('cover')

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    pitches: '1',
    isIndoor: false,
    turfType: 'Artificial Grass',
    cityName: '',
    areaName: '',
    address: '',
    pricePerHour: '',
    coverImage: '',
    additionalImage: '',
    surface: 'Lawn Turf',
    size: '',
    maxPlayers: '',
    amenities: [] as string[],
    pincode: '',
    googleMapsLink: '',
    weekendPrice: '',
    peakPrice: '',
    advanceLimit: '15',
    openingTime: '06:00',
    closingTime: '23:00',
    weeklyHolidays: [] as string[],
    slotDuration: '60',
    documents: [] as string[],
  })

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const validateStep = () => {
    if (currentStep === 1) {
      if (!formData.name.trim()) return 'Venue name is required.'
      if (!formData.description.trim()) return 'Description is required.'
      return true
    }
    if (currentStep === 2) {
      if (!formData.cityName.trim()) return 'City name is required.'
      if (!formData.areaName.trim()) return 'Area/Neighborhood name is required.'
      if (!formData.address.trim()) return 'Complete address is required.'
      return true
    }
    if (currentStep === 3) {
      if (!formData.pricePerHour || isNaN(Number(formData.pricePerHour)))
        return 'Valid price is required.'
      if (!formData.coverImage) return 'Cover photo (Photo 1) is required.'
      if (!formData.additionalImage) return 'Additional photo (Photo 2) is required.'
      return true
    }
    if (currentStep === 4) {
      if (formData.documents.length === 0)
        return 'Please upload at least one verification document (Govt ID or Business Registration).'
      return true
    }
    return true
  }

  const handleNext = () => {
    const isValid = validateStep()
    if (isValid !== true) {
      setToast({ message: isValid as string, type: 'error' })
      return
    }
    if (currentStep < 4) setCurrentStep((prev) => prev + 1)
  }

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((prev) => prev - 1)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const inputType = activeInputRef.current
    setUploading(inputType)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('venue_images')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('venue_images').getPublicUrl(filePath)

      if (inputType === 'cover') {
        updateField('coverImage', publicUrl)
      } else {
        updateField('additionalImage', publicUrl)
      }
      setToast({
        message: `${inputType === 'cover' ? 'Cover' : 'Additional'} image uploaded successfully!`,
        type: 'success',
      })
    } catch (err: any) {
      setToast({ message: err.message || 'Error uploading image.', type: 'error' })
    } finally {
      setUploading(false)
    }
  }

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setToast({ message: 'Document must be less than 5MB.', type: 'error' })
      return
    }

    setDocUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
      const filePath = `docs/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('venue_documents')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('venue_documents').getPublicUrl(filePath)

      updateField('documents', [...formData.documents, publicUrl])
      setToast({ message: 'Document uploaded successfully!', type: 'success' })
    } catch (err: any) {
      setToast({ message: err.message || 'Error uploading document.', type: 'error' })
    } finally {
      setDocUploading(false)
    }
  }

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setToast({ message: 'Geolocation is not supported by your browser.', type: 'error' })
      return
    }

    setToast({ message: 'Detecting exact location and mapping regions...', type: 'success' })

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          )
          const data = await res.json()

          if (data && data.display_name) {
            updateField('address', data.display_name)

            // Extract City and Area from Nominatim response
            const addressObj = data.address || {}
            let detectedCity =
              addressObj.city || addressObj.town || addressObj.county || addressObj.state_district
            let detectedArea =
              addressObj.suburb ||
              addressObj.neighbourhood ||
              addressObj.village ||
              addressObj.residential ||
              addressObj.city_district

            if (detectedCity) updateField('cityName', detectedCity)
            if (detectedArea) updateField('areaName', detectedArea)
            if (addressObj.postcode) updateField('pincode', addressObj.postcode)

            setToast({ message: 'Location auto-filled successfully!', type: 'success' })
          } else {
            throw new Error('No address found')
          }
        } catch (error) {
          setToast({ message: 'Failed to fetch address from coordinates.', type: 'error' })
        }
      },
      (error) => {
        setToast({ message: `Location error: ${error.message}`, type: 'error' })
      }
    )
  }

  const handleSubmit = async () => {
    const isValid = validateStep()
    if (isValid !== true) {
      setToast({ message: isValid as string, type: 'error' })
      return
    }

    setIsSubmitting(true)
    try {
      // 1. Get Owner ID
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Not logged in')

      const { data: profile } = await supabase
        .from('owner_profiles')
        .select('id')
        .eq('user_id', userData.user.id)
        .single()

      let ownerProfileId = profile?.id

      if (!profile) {
        // Automatically create an owner profile for the user (e.g., admin testing)
        const { data: newProfile, error: createError } = await supabase
          .from('owner_profiles')
          .insert({
            user_id: userData.user.id,
            full_name: userData.user.email?.split('@')[0] || 'Admin',
            business_name: 'Turf Gaming Testing',
          })
          .select('id')
          .single()

        if (createError || !newProfile) {
          throw new Error(`Creation failed: ${createError?.message || 'Unknown error'}`)
        }
        ownerProfileId = newProfile.id
      }

      // 1.5 Handle City & Area (Find or Create)
      let cityIdToUse = null
      let { data: existingCity } = await supabase
        .from('cities')
        .select('id')
        .ilike('name', formData.cityName.trim())
        .maybeSingle()

      if (existingCity) {
        cityIdToUse = existingCity.id
      } else {
        const { data: newCity } = await supabase
          .from('cities')
          .insert({ name: formData.cityName.trim(), state: 'Unknown State' })
          .select('id')
          .single()
        if (newCity) cityIdToUse = newCity.id
      }

      let areaIdToUse = null
      if (cityIdToUse) {
        let { data: existingArea } = await supabase
          .from('areas')
          .select('id')
          .eq('city_id', cityIdToUse)
          .ilike('name', formData.areaName.trim())
          .maybeSingle()

        if (existingArea) {
          areaIdToUse = existingArea.id
        } else {
          const { data: newArea } = await supabase
            .from('areas')
            .insert({
              name: formData.areaName.trim(),
              city_id: cityIdToUse,
              pincode: formData.pincode || null,
            })
            .select('id')
            .single()
          if (newArea) areaIdToUse = newArea.id
        }
      }

      // 2. Insert Venue
      const { data: venue, error: venueError } = await supabase
        .from('venues')
        .insert({
          owner_id: ownerProfileId,
          name: formData.name,
          description: formData.description,
          pitches: parseInt(formData.pitches),
          is_indoor: formData.isIndoor,
          turf_type: formData.turfType,
          surface: formData.surface,
          size: formData.size,
          max_players: formData.maxPlayers ? parseInt(formData.maxPlayers) : null,
          amenities: formData.amenities,
          city_id: cityIdToUse,
          area_id: areaIdToUse,
          address: formData.address,
          pincode: formData.pincode,
          google_maps_link: formData.googleMapsLink,
          opening_time: formData.openingTime,
          closing_time: formData.closingTime,
          weekly_holidays: formData.weeklyHolidays,
          slot_duration: parseInt(formData.slotDuration),
          verification_status: 'UNDER_REVIEW',
          documents_url: formData.documents,
        })
        .select()
        .single()

      if (venueError) throw venueError

      // 3. Insert Pricing
      const { error: pricingError } = await supabase.from('venue_pricing').insert({
        venue_id: venue.id,
        price: Number(formData.pricePerHour),
        weekend_price: formData.weekendPrice ? Number(formData.weekendPrice) : null,
        peak_price: formData.peakPrice ? Number(formData.peakPrice) : null,
        advance_limit: parseInt(formData.advanceLimit),
      })

      if (pricingError) throw pricingError

      // 4. Insert Images (Dummy implementation if user typed URLs, or just leave empty for now)
      if (formData.coverImage) {
        await supabase.from('venue_images').insert({
          venue_id: venue.id,
          url: formData.coverImage,
          is_cover: true,
        })
      }
      if (formData.additionalImage) {
        await supabase.from('venue_images').insert({
          venue_id: venue.id,
          url: formData.additionalImage,
          is_cover: false,
        })
      }

      setToast({ message: 'Venue submitted successfully! Awaiting verification.', type: 'success' })
      setTimeout(() => {
        router.push('/owner/venues')
      }, 2000)
    } catch (e: any) {
      console.error(e)
      let msg = e.message || 'Error submitting venue'
      if (msg.toLowerCase().includes('row-level security') || msg.toLowerCase().includes('rls')) {
        msg =
          "Database Error: RLS policy violation on 'venue_pricing'. Please run the migration SQL scripts inside your Supabase dashboard SQL Editor!"
      }
      setToast({ message: msg, type: 'error' })
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Add New Venue</h1>
        <p className="text-gray-400">List your turf and start accepting bookings.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/10 -z-10 -translate-y-1/2" />
        {STEPS.map((step, index) => {
          const isActive = step.id === currentStep
          const isCompleted = step.id < currentStep
          const Icon = step.icon

          return (
            <div key={step.id} className="flex flex-col items-center gap-2">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                  isActive
                    ? 'bg-green-500 text-black shadow-lg shadow-green-500/20 scale-110'
                    : isCompleted
                      ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                      : 'bg-[#111] text-gray-500 border border-white/10'
                }`}
              >
                {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-5 h-5" />}
              </div>
              <span
                className={`text-xs font-semibold ${
                  isActive ? 'text-green-500' : isCompleted ? 'text-gray-300' : 'text-gray-600'
                }`}
              >
                {step.title}
              </span>
            </div>
          )
        })}
      </div>

      {/* Form Card */}
      <div className="bg-[#0a0f0a] border border-white/8 rounded-2xl p-8 shadow-2xl">
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Venue Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g. Olympia Sports Arena"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Describe your venue, facilities, and unique features..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50 resize-none"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Number of Pitches/Courts
                </label>
                <select
                  value={formData.pitches}
                  onChange={(e) => updateField('pitches', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-green-500/50"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n} className="text-black bg-white">
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Turf Type
                </label>
                <select
                  value={formData.turfType}
                  onChange={(e) => updateField('turfType', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-green-500/50"
                >
                  <option value="Artificial Grass" className="text-black bg-white">
                    Artificial Grass
                  </option>
                  <option value="Natural Grass" className="text-black bg-white">
                    Natural Grass
                  </option>
                  <option value="Clay Court" className="text-black bg-white">
                    Clay Court
                  </option>
                  <option value="Hard Court" className="text-black bg-white">
                    Hard Court
                  </option>
                  <option value="Indoor Wooden" className="text-black bg-white">
                    Indoor Wooden
                  </option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Surface
                </label>
                <select
                  value={formData.surface}
                  onChange={(e) => updateField('surface', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-green-500/50"
                >
                  <option value="Lawn Turf" className="text-black bg-white">
                    Lawn Turf
                  </option>
                  <option value="Concrete" className="text-black bg-white">
                    Concrete
                  </option>
                  <option value="Wooden" className="text-black bg-white">
                    Wooden
                  </option>
                  <option value="Mud" className="text-black bg-white">
                    Mud
                  </option>
                  <option value="Mat" className="text-black bg-white">
                    Mat
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Size
                </label>
                <input
                  type="text"
                  value={formData.size}
                  onChange={(e) => updateField('size', e.target.value)}
                  placeholder="e.g. 120x80 ft"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Max Players
                </label>
                <input
                  type="number"
                  value={formData.maxPlayers}
                  onChange={(e) => updateField('maxPlayers', e.target.value)}
                  placeholder="e.g. 14"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Amenities
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  'Parking Available',
                  'Flood Lights',
                  'Washrooms',
                  'Drinking Water',
                  'Changing Room',
                  'First Aid Kit',
                ].map((amenity) => (
                  <div key={amenity} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`amenity-${amenity}`}
                      checked={formData.amenities.includes(amenity)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          updateField('amenities', [...formData.amenities, amenity])
                        } else {
                          updateField(
                            'amenities',
                            formData.amenities.filter((a) => a !== amenity)
                          )
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-600 text-green-500 focus:ring-green-500 bg-transparent"
                    />
                    <label
                      htmlFor={`amenity-${amenity}`}
                      className="text-sm text-gray-300 cursor-pointer"
                    >
                      {amenity}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
              <input
                type="checkbox"
                id="isIndoor"
                checked={formData.isIndoor}
                onChange={(e) => updateField('isIndoor', e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 text-green-500 focus:ring-green-500 focus:ring-offset-gray-900 bg-transparent"
              />
              <label htmlFor="isIndoor" className="text-sm font-medium text-white cursor-pointer">
                This is an indoor venue
              </label>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={formData.cityName}
                  onChange={(e) => updateField('cityName', e.target.value)}
                  placeholder="e.g. Hyderabad"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Area / Neighborhood
                </label>
                <input
                  type="text"
                  value={formData.areaName}
                  onChange={(e) => updateField('areaName', e.target.value)}
                  placeholder="e.g. Madhapur"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50"
                />
              </div>
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Complete Address
                  </label>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    className="text-xs font-semibold text-green-500 hover:text-green-400 flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded-md transition-colors"
                  >
                    <MapPin className="w-3 h-3" /> Detect My Location
                  </button>
                </div>
                <textarea
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="Enter the full street address..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Pincode
                </label>
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => updateField('pincode', e.target.value)}
                  placeholder="e.g. 500081"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Google Maps Link
                </label>
                <input
                  type="url"
                  value={formData.googleMapsLink}
                  onChange={(e) => updateField('googleMapsLink', e.target.value)}
                  placeholder="e.g. https://maps.app.goo.gl/..."
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50"
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Base Price (Per Hour)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <IndianRupee className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type="number"
                    value={formData.pricePerHour}
                    onChange={(e) => updateField('pricePerHour', e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Weekend Price
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <IndianRupee className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type="number"
                    value={formData.weekendPrice}
                    onChange={(e) => updateField('weekendPrice', e.target.value)}
                    placeholder="e.g. 1800"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Peak Price
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <IndianRupee className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type="number"
                    value={formData.peakPrice}
                    onChange={(e) => updateField('peakPrice', e.target.value)}
                    placeholder="e.g. 2000"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Opening Time
                </label>
                <input
                  type="time"
                  value={formData.openingTime}
                  onChange={(e) => updateField('openingTime', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-green-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Closing Time
                </label>
                <input
                  type="time"
                  value={formData.closingTime}
                  onChange={(e) => updateField('closingTime', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-green-500/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Advance Booking Limit (Days)
                </label>
                <input
                  type="number"
                  value={formData.advanceLimit}
                  onChange={(e) => updateField('advanceLimit', e.target.value)}
                  placeholder="e.g. 15"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-green-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Default Slot Duration (Mins)
                </label>
                <input
                  type="number"
                  value={formData.slotDuration}
                  onChange={(e) => updateField('slotDuration', e.target.value)}
                  placeholder="e.g. 60"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-green-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Weekly Holidays
              </label>
              <div className="flex flex-wrap gap-3">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
                  (day) => (
                    <div key={day} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`holiday-${day}`}
                        checked={formData.weeklyHolidays.includes(day)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateField('weeklyHolidays', [...formData.weeklyHolidays, day])
                          } else {
                            updateField(
                              'weeklyHolidays',
                              formData.weeklyHolidays.filter((d) => d !== day)
                            )
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-600 text-green-500 focus:ring-green-500 bg-transparent"
                      />
                      <label
                        htmlFor={`holiday-${day}`}
                        className="text-sm text-gray-300 cursor-pointer"
                      >
                        {day}
                      </label>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-6">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Venue Photos (Please upload exactly 2 images)
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Photo 1: Cover */}
                <div className="space-y-2">
                  <span className="text-xs text-gray-500 font-semibold block">
                    Photo 1 (Cover Photo - Required)
                  </span>
                  <div
                    onClick={() => {
                      activeInputRef.current = 'cover'
                      fileInputRef.current?.click()
                    }}
                    className="w-full h-40 rounded-xl bg-white/5 border-2 border-white/10 border-dashed flex flex-col items-center justify-center text-gray-500 hover:bg-white/10 hover:text-white hover:border-green-500/50 transition-all cursor-pointer group overflow-hidden relative"
                  >
                    {uploading === 'cover' ? (
                      <Loader2 className="w-6 h-6 text-green-400 animate-spin" />
                    ) : formData.coverImage ? (
                      <img src={formData.coverImage} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-4">
                        <Upload className="w-6 h-6 mx-auto mb-2 text-green-500/80" />
                        <span className="text-xs font-semibold text-white block">
                          Upload Cover Photo
                        </span>
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    value={formData.coverImage}
                    onChange={(e) => updateField('coverImage', e.target.value)}
                    placeholder="Or enter Cover Image URL"
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white"
                  />
                </div>

                {/* Photo 2: Additional */}
                <div className="space-y-2">
                  <span className="text-xs text-gray-500 font-semibold block">
                    Photo 2 (Additional Photo - Required)
                  </span>
                  <div
                    onClick={() => {
                      activeInputRef.current = 'additional'
                      fileInputRef.current?.click()
                    }}
                    className="w-full h-40 rounded-xl bg-white/5 border-2 border-white/10 border-dashed flex flex-col items-center justify-center text-gray-500 hover:bg-white/10 hover:text-white hover:border-green-500/50 transition-all cursor-pointer group overflow-hidden relative"
                  >
                    {uploading === 'additional' ? (
                      <Loader2 className="w-6 h-6 text-green-400 animate-spin" />
                    ) : formData.additionalImage ? (
                      <img src={formData.additionalImage} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-4">
                        <Upload className="w-6 h-6 mx-auto mb-2 text-green-500/80" />
                        <span className="text-xs font-semibold text-white block">
                          Upload Additional Photo
                        </span>
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    value={formData.additionalImage}
                    onChange={(e) => updateField('additionalImage', e.target.value)}
                    placeholder="Or enter Additional Image URL"
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white"
                  />
                </div>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Verification Documents
              </label>
              <p className="text-sm text-gray-500 mb-4">
                To verify your listing, please upload at least one official document (e.g., Govt ID,
                Business Registration, or Property Deed).
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.documents.map((doc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-white/5 border border-white/10 p-4 rounded-xl"
                  >
                    <span className="text-sm text-white truncate mr-4">Document {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => {
                        updateField(
                          'documents',
                          formData.documents.filter((_, i) => i !== idx)
                        )
                      }}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <label className="flex items-center justify-center w-full h-32 px-4 transition bg-white/5 border-2 border-white/10 border-dashed rounded-xl appearance-none cursor-pointer hover:border-green-500/50 hover:bg-white/10 focus:outline-none">
                  <span className="flex items-center space-x-2">
                    {docUploading ? (
                      <Loader2 className="w-6 h-6 text-green-500 animate-spin" />
                    ) : (
                      <Upload className="w-6 h-6 text-gray-400" />
                    )}
                    <span className="font-medium text-gray-400">
                      {docUploading ? 'Uploading...' : 'Click to upload a document (PDF, JPG, PNG)'}
                    </span>
                  </span>
                  <input
                    type="file"
                    name="file_upload"
                    className="hidden"
                    accept=".pdf,image/*"
                    onChange={handleDocUpload}
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
          <button
            onClick={handleBack}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              currentStep === 1
                ? 'opacity-0 pointer-events-none'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {currentStep < 4 ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-green-500 text-black text-sm font-bold hover:bg-green-400 transition-all shadow-lg shadow-green-900/20"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-green-500 text-black text-sm font-bold hover:bg-green-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-900/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Submit Venue
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Toast */}
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
