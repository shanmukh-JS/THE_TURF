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
]

export default function NewVenuePage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null)

  // Data fetching state
  const [cities, setCities] = useState<any[]>([])
  const [areas, setAreas] = useState<any[]>([])
  const [isLoadingLocations, setIsLoadingLocations] = useState(true)

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    pitches: '1',
    isIndoor: false,
    turfType: 'Artificial Grass',
    cityId: '',
    areaId: '',
    address: '',
    pricePerHour: '',
    coverImage: '',
    additionalImages: [] as string[],
  })

  useEffect(() => {
    async function loadCities() {
      setIsLoadingLocations(true)
      const { data } = await supabase.from('cities').select('*')
      if (data) setCities(data)
      setIsLoadingLocations(false)
    }
    loadCities()
  }, [])

  useEffect(() => {
    async function loadAreas() {
      if (!formData.cityId) {
        setAreas([])
        return
      }
      const { data } = await supabase.from('areas').select('*').eq('city_id', formData.cityId)
      if (data) setAreas(data)
    }
    loadAreas()
  }, [formData.cityId])

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
      if (!formData.cityId) return 'Please select a city.'
      if (!formData.areaId) return 'Please select an area.'
      if (!formData.address.trim()) return 'Complete address is required.'
      return true
    }
    if (currentStep === 3) {
      if (!formData.pricePerHour || isNaN(Number(formData.pricePerHour)))
        return 'Valid price is required.'
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
    if (currentStep < 3) setCurrentStep((prev) => prev + 1)
  }

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((prev) => prev - 1)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
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

      updateField('coverImage', publicUrl)
      setToast({ message: 'Cover image uploaded successfully!', type: 'success' })
    } catch (err: any) {
      setToast({ message: err.message || 'Error uploading image.', type: 'error' })
    } finally {
      setUploading(false)
    }
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

      if (!profile) throw new Error('Owner profile not found')

      // 2. Insert Venue
      const { data: venue, error: venueError } = await supabase
        .from('venues')
        .insert({
          owner_id: profile.id,
          name: formData.name,
          description: formData.description,
          pitches: parseInt(formData.pitches),
          is_indoor: formData.isIndoor,
          turf_type: formData.turfType,
          city_id: formData.cityId,
          area_id: formData.areaId,
          address: formData.address,
          verification_status: 'PENDING',
        })
        .select()
        .single()

      if (venueError) throw venueError

      // 3. Insert Pricing
      const { error: pricingError } = await supabase.from('venue_pricing').insert({
        venue_id: venue.id,
        price: Number(formData.pricePerHour),
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
            {isLoadingLocations ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    City
                  </label>
                  <select
                    value={formData.cityId}
                    onChange={(e) => updateField('cityId', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-green-500/50"
                  >
                    <option value="" className="text-black bg-white">
                      Select a city...
                    </option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.id} className="text-black bg-white">
                        {city.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Area / Neighborhood
                  </label>
                  <select
                    value={formData.areaId}
                    onChange={(e) => updateField('areaId', e.target.value)}
                    disabled={!formData.cityId || areas.length === 0}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-green-500/50 disabled:opacity-50"
                  >
                    <option value="" className="text-black bg-white">
                      Select an area...
                    </option>
                    {areas.map((area) => (
                      <option key={area.id} value={area.id} className="text-black bg-white">
                        {area.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Complete Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    placeholder="Enter the full street address..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50 resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
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
              <p className="text-xs text-gray-500 mt-2">
                You can set dynamic pricing for specific slots later.
              </p>
            </div>

            <div className="pt-4 border-t border-white/10">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Venue Photos
              </label>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-48 rounded-2xl bg-white/5 border-2 border-white/10 border-dashed flex flex-col items-center justify-center text-gray-500 hover:bg-white/10 hover:text-white hover:border-green-500/50 transition-all cursor-pointer group overflow-hidden relative"
              >
                {uploading ? (
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
                    <p className="text-xs text-gray-400">Uploading cover image...</p>
                  </div>
                ) : formData.coverImage ? (
                  <div className="w-full h-full relative group">
                    <img
                      src={formData.coverImage}
                      alt="Venue Cover"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white text-black font-semibold text-xs">
                        <Upload className="w-4 h-4" /> Change Photo
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 mb-3 group-hover:-translate-y-1 transition-transform text-green-500/80" />
                    <p className="text-sm font-semibold text-white">Click to upload photos</p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                  </>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />

              {/* Placeholder for URL input if Cloudinary isn't ready */}
              <div className="mt-4">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Or enter image URL directly
                </label>
                <input
                  type="text"
                  value={formData.coverImage}
                  onChange={(e) => updateField('coverImage', e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50"
                />
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

          {currentStep < 3 ? (
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
