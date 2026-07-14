'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Building2,
  CalendarClock,
  CreditCard,
  Bell,
  ShieldAlert,
  AlertTriangle,
  Upload,
  Save,
  CheckCircle2,
  X,
  RefreshCw,
  MapPin,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'

const defaultSettings = {
  business: {
    turfName: '',
    ownerName: '',
    email: '',
    phone: '',
    address: '',
    logoUrl: '',
  },
  booking: {
    autoAccept: true,
    cancellationPolicy: 'flexible',
    bufferTime: '0',
    maxPlayers: 12,
  },

  notifications: {
    booking: true,
    payment: true,
    email: true,
    sms: false,
  },
}

const InputField = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  error = '',
}: any) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-4 py-3 rounded-xl bg-white/5 border ${
        error
          ? 'border-red-500/50 focus:border-red-500 bg-red-500/[0.02]'
          : 'border-white/10 focus:border-green-500/50 focus:bg-white/10'
      } text-white placeholder:text-gray-600 focus:outline-none transition-all`}
    />
    {error && <p className="text-[11px] font-medium text-red-400 pl-1">{error}</p>}
  </div>
)

const Toggle = ({ checked, onChange, label, description }: any) => (
  <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
    <div>
      <h4 className="text-sm font-semibold text-white">{label}</h4>
      <p className="text-xs text-gray-500 mt-0.5">{description}</p>
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-[#0a0f0a] ${
        checked ? 'bg-green-500' : 'bg-gray-600'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
)

export default function OwnerSettingsPage() {
  const [formData, setFormData] = useState(defaultSettings)
  const [initialData, setInitialData] = useState(defaultSettings)
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Security & Danger Zone state
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordFields, setPasswordFields] = useState({ newPassword: '', confirmPassword: '' })
  const [showPw, setShowPw] = useState(false)
  const [isPasswordSaving, setIsPasswordSaving] = useState(false)
  const [isListingDisabled, setIsListingDisabled] = useState(false)
  const [isDangerLoading, setIsDangerLoading] = useState(false)
  const [ownerProfileIdForDanger, setOwnerProfileIdForDanger] = useState<string | null>(null)

  const [passwordStrength, setPasswordStrength] = useState<'Weak' | 'Medium' | 'Strong'>('Weak')
  const [passwordChecks, setPasswordChecks] = useState({
    length: false,
    upper: false,
    lower: false,
    number: false,
    special: false,
    notCommon: false,
  })

  // Live password strength validator for settings update
  useEffect(() => {
    const pwd = passwordFields.newPassword
    const isLength = pwd.length >= 12
    const isUpper = /[A-Z]/.test(pwd)
    const isLower = /[a-z]/.test(pwd)
    const isNumber = /[0-9]/.test(pwd)
    const isSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwd)

    const weakDictionary = ['12345678', 'password123', 'qwerty', 'trufgaming123', 'welcome123']
    const isNotCommon = !weakDictionary.some((weak) => pwd.toLowerCase().includes(weak))

    setPasswordChecks({
      length: isLength,
      upper: isUpper,
      lower: isLower,
      number: isNumber,
      special: isSpecial,
      notCommon: isNotCommon,
    })

    const criteriaMet = [isLength, isUpper, isLower, isNumber, isSpecial, isNotCommon].filter(
      Boolean
    ).length

    if (criteriaMet <= 3) {
      setPasswordStrength('Weak')
    } else if (criteriaMet <= 5) {
      setPasswordStrength('Medium')
    } else {
      setPasswordStrength('Strong')
    }
  }, [passwordFields.newPassword])

  // Secure Email Change OTP states
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [otpToken, setOtpToken] = useState('')
  const [emailStep, setEmailStep] = useState<'request' | 'verify'>('request')
  const [emailLoading, setEmailLoading] = useState(false)

  const supabase = createClient()

  const { user, isLoading: authLoading } = useAuthStore()

  // Real-time validations
  const emailVal = formData.business.email.trim()
  const emailError =
    emailVal && !/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,3}$/.test(emailVal)
      ? 'Please enter a valid email address (e.g. name@domain.com)'
      : ''

  const phoneRaw = formData.business.phone.trim().replace(/[\s\-\+\(\)]/g, '')
  let phoneCleaned = phoneRaw
  if (phoneRaw.startsWith('91') && phoneRaw.length === 12) {
    phoneCleaned = phoneRaw.substring(2)
  }
  const phoneError =
    phoneRaw && !/^[0-9]{10}$/.test(phoneCleaned) ? 'Phone number must be exactly 10 digits' : ''

  useEffect(() => {
    // Auth store is done loading but no user — stop spinning
    if (!authLoading && !user) {
      setIsLoading(false)
      return
    }

    async function loadSettings() {
      if (!user) return

      setIsLoading(true)
      try {
        await supabase.auth.refreshSession()
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()
        let profile = null
        const { data: existingProfile } = await supabase
          .from('owner_profiles')
          .select('id, full_name, business_name')
          .eq('user_id', user.id)
          .maybeSingle()

        // Fetch registration details from public.users to use as defaults
        const { data: publicUser } = await supabase
          .from('users')
          .select('full_name, phone')
          .eq('id', user.id)
          .maybeSingle()

        if (!existingProfile) {
          const { data: newProfile } = await supabase
            .from('owner_profiles')
            .insert({
              user_id: user.id,
              full_name:
                publicUser?.full_name || user.fullName || user.email?.split('@')[0] || 'Owner',
              business_name: 'My Turf Business',
            })
            .select('id, full_name, business_name')
            .single()
          profile = newProfile
        } else {
          profile = existingProfile
        }

        if (!profile) return

        // Set the profile id for danger zone actions
        setOwnerProfileIdForDanger(profile.id)

        const { data: settings } = await supabase
          .from('owner_settings')
          .select('*')
          .eq('owner_id', profile.id)
          .maybeSingle()

        const mappedData = {
          business: {
            turfName: profile.business_name || '',
            ownerName: profile.full_name || publicUser?.full_name || user.fullName || '',
            email: settings?.business_email || user.email || '',
            phone: settings?.business_phone || authUser?.phone || publicUser?.phone || '',
            address: settings?.business_address || '',
            logoUrl: settings?.business_logo_url || '',
          },
          booking: {
            autoAccept: settings ? settings.auto_accept_bookings : true,
            cancellationPolicy: settings?.cancellation_policy || 'flexible',
            bufferTime: settings?.booking_buffer_time || '0',
            maxPlayers: settings?.max_players_per_booking || 12,
          },

          notifications: {
            booking: settings ? settings.notify_bookings : true,
            payment: settings ? settings.notify_payments : true,
            email: settings ? settings.notify_email : true,
            sms: settings ? settings.notify_sms : false,
          },
        }

        setFormData(mappedData)
        setInitialData(mappedData)

        // Fetch current venue listing status
        const { data: firstVenue } = await supabase
          .from('venues')
          .select('id, is_disabled')
          .eq('owner_id', profile.id)
          .maybeSingle()
        if (firstVenue) {
          setIsListingDisabled(!!firstVenue.is_disabled)
        }
      } catch (e) {
        console.error('Error loading settings:', e)
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [user, authLoading])

  // Track changes to show the sticky save bar
  useEffect(() => {
    if (!isLoading) {
      const isChanged = JSON.stringify(formData) !== JSON.stringify(initialData)
      setHasChanges(isChanged)
    }
  }, [formData, initialData, isLoading])

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      if (!user) throw new Error('Not logged in')

      // 1. Validate Email
      const email = formData.business.email.trim()
      const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,3}$/
      if (!email) {
        throw new Error('Email address is required')
      }
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address')
      }

      // 2. Validate Phone
      let phone = formData.business.phone.trim().replace(/[\s\-\+\(\)]/g, '')
      if (!phone) {
        throw new Error('Phone number is required')
      }
      if (phone.startsWith('91') && phone.length === 12) {
        phone = phone.substring(2)
      }
      const phoneRegex = /^[0-9]{10}$/
      if (!phoneRegex.test(phone)) {
        throw new Error('Please enter a valid 10-digit phone number')
      }

      // Sync normalized values back to state so user sees formatting cleanup
      setFormData((prev) => ({
        ...prev,
        business: {
          ...prev.business,
          email,
          phone,
        },
      }))

      const { data: profile } = await supabase
        .from('owner_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!profile) throw new Error('Profile not found')

      // First update the profile for turfName / ownerName
      await supabase
        .from('owner_profiles')
        .update({
          full_name: formData.business.ownerName,
          business_name: formData.business.turfName,
        })
        .eq('id', profile.id)

      // Then upsert settings
      const settingsPayload = {
        owner_id: profile.id,
        business_email: email,
        business_phone: phone,
        business_address: formData.business.address,
        business_logo_url: formData.business.logoUrl,

        auto_accept_bookings: formData.booking.autoAccept,
        cancellation_policy: formData.booking.cancellationPolicy,
        booking_buffer_time: formData.booking.bufferTime,
        max_players_per_booking: Number(formData.booking.maxPlayers) || 12,

        notify_bookings: formData.notifications.booking,
        notify_payments: formData.notifications.payment,
        notify_email: formData.notifications.email,
        notify_sms: formData.notifications.sms,

        updated_at: new Date().toISOString(),
      }

      const { data: existingSettings } = await supabase
        .from('owner_settings')
        .select('id')
        .eq('owner_id', profile.id)
        .maybeSingle()

      if (existingSettings) {
        await supabase.from('owner_settings').update(settingsPayload).eq('id', existingSettings.id)
      } else {
        await supabase.from('owner_settings').insert([settingsPayload])
      }

      setInitialData(formData)
      setHasChanges(false)
      useAuthStore.getState().setLogoUrl(formData.business.logoUrl)
      setToast({ message: 'Settings saved successfully', type: 'success' })
    } catch (e: any) {
      console.error(e)
      setToast({ message: e.message || 'Error saving settings', type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  const updateSection = (section: keyof typeof formData, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }))
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setIsUploading(true)
      const file = event.target.files?.[0]
      if (!file) return

      if (file.size > 2 * 1024 * 1024) {
        setToast({ message: 'Image must be smaller than 2MB', type: 'error' })
        return
      }

      if (!user) throw new Error('Not logged in')

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('business_logos')
        .upload(filePath, file)

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found')) {
          throw new Error('Please run the storage_setup.sql in Supabase first!')
        }
        throw uploadError
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('business_logos').getPublicUrl(filePath)

      updateSection('business', 'logoUrl', publicUrl)
      setToast({
        message: 'Logo uploaded successfully. Make sure to click Save Changes!',
        type: 'success',
      })
    } catch (e: any) {
      console.error(e)
      setToast({ message: e.message || 'Error uploading image', type: 'error' })
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setToast({ message: 'Geolocation is not supported by your browser.', type: 'error' })
      return
    }

    setToast({ message: 'Detecting exact location...', type: 'success' })

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          )
          const data = await res.json()

          if (data && data.display_name) {
            updateSection('business', 'address', data.display_name)
            setToast({ message: 'Location auto-filled successfully!', type: 'success' })
          } else {
            throw new Error('No address found')
          }
        } catch (error) {
          setToast({ message: 'Failed to fetch address from coordinates.', type: 'error' })
        }
      },
      (error: any) => {
        setToast({ message: `Location error: ${error.message}`, type: 'error' })
      }
    )
  }

  const handleUpdatePassword = async () => {
    if (passwordStrength !== 'Strong') {
      setToast({ message: 'Password must meet all complexity requirements', type: 'error' })
      return
    }
    if (passwordFields.newPassword !== passwordFields.confirmPassword) {
      setToast({ message: 'Passwords do not match', type: 'error' })
      return
    }
    setIsPasswordSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordFields.newPassword })
      if (error) throw error
      setToast({ message: 'Password updated successfully!', type: 'success' })
      setShowPasswordModal(false)
      setPasswordFields({ newPassword: '', confirmPassword: '' })
    } catch (e: any) {
      setToast({ message: e.message || 'Error updating password', type: 'error' })
    } finally {
      setIsPasswordSaving(false)
    }
  }

  const handleToggleListing = async () => {
    if (!ownerProfileIdForDanger) return
    setIsDangerLoading(true)
    const newIsDisabled = !isListingDisabled
    const { error } = await supabase
      .from('venues')
      .update({ is_disabled: newIsDisabled })
      .eq('owner_id', ownerProfileIdForDanger)
    if (error) {
      setToast({ message: 'Failed to update listing status: ' + error.message, type: 'error' })
    } else {
      setIsListingDisabled(newIsDisabled)
      setToast({
        message: !newIsDisabled
          ? 'Your turf listing is now LIVE!'
          : 'Your turf listing has been hidden from customers.',
        type: !newIsDisabled ? 'success' : 'error',
      })
    }
    setIsDangerLoading(false)
  }

  const handleRequestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault()
    const emailTrimmed = newEmail.trim()
    if (!emailTrimmed) {
      setToast({ message: 'Please enter a new email address', type: 'error' })
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,3}$/
    if (!emailRegex.test(emailTrimmed)) {
      setToast({
        message: 'Please enter a valid email address (e.g. name@domain.com)',
        type: 'error',
      })
      return
    }
    setEmailLoading(true)
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailTrimmed, purpose: 'email_change' }),
      })
      const result = await res.json()
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to request email change')
      }
      setToast({ message: 'Verification code sent to your new email!', type: 'success' })
      setEmailStep('verify')
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to request email change', type: 'error' })
    } finally {
      setEmailLoading(false)
    }
  }

  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const tokenTrimmed = otpToken.trim()
    if (!tokenTrimmed) {
      setToast({ message: 'Please enter the 6-digit OTP code', type: 'error' })
      return
    }
    setEmailLoading(true)
    try {
      const res = await fetch('/api/auth/verify-email-change-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail.trim(), otp: tokenTrimmed }),
      })
      const result = await res.json()
      if (!result.success) {
        throw new Error(result.error?.message || 'Verification failed')
      }

      await supabase
        .from('owner_settings')
        .update({ business_email: newEmail.trim() })
        .eq('owner_id', ownerProfileIdForDanger)

      setFormData((d) => ({
        ...d,
        business: { ...d.business, email: newEmail.trim() },
      }))

      // Sync auth state locally
      const sessionRes = await fetch('/api/auth/session')
      const { user } = await sessionRes.json()
      if (user) {
        useAuthStore.getState().setUser(user)
      }

      setToast({ message: 'Email address updated successfully!', type: 'success' })
      setShowEmailModal(false)
      setNewEmail('')
      setOtpToken('')
      setEmailStep('request')
      router.refresh()
    } catch (err: any) {
      setToast({
        message: err.message || 'Verification failed. Please check the code and try again.',
        type: 'error',
      })
    } finally {
      setEmailLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you absolutely sure? This will permanently delete your account, all venues, bookings, and data. This cannot be undone.'
    )
    if (!confirmed) return

    const doubleConfirm = window.confirm(
      'FINAL WARNING: Your account and all associated data will be permanently deleted. Click OK to confirm.'
    )
    if (!doubleConfirm) return

    setIsDangerLoading(true)
    try {
      // Mark venues as inactive first
      if (ownerProfileIdForDanger) {
        await supabase
          .from('venues')
          .update({ is_active: false })
          .eq('owner_id', ownerProfileIdForDanger)
      }
      // Sign out and redirect
      await supabase.auth.signOut()
      setToast({ message: 'Account deleted. Redirecting...', type: 'success' })
      setTimeout(() => router.push('/'), 1500)
    } catch (e: any) {
      setToast({ message: e.message || 'Error deleting account', type: 'error' })
    } finally {
      setIsDangerLoading(false)
    }
  }

  const Toggle = ({ checked, onChange, label, description }: any) => (
    <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          checked ? 'bg-green-500' : 'bg-gray-600'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] w-full">
        <RefreshCw className="w-8 h-8 text-green-500 animate-spin" />
        <p className="mt-4 text-sm text-gray-400 font-medium tracking-wide animate-pulse">
          Loading settings...
        </p>
      </div>
    )
  }

  return (
    <div className="relative pb-24 h-full">
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">Manage your business profile, bookings, and preferences.</p>
        </div>

        {/* 1. Business Profile */}
        <section className="bg-[#0a0f0a] border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/8 flex items-center gap-3">
            <Building2 className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-semibold text-white">Business Profile</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-6">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 border-dashed flex flex-col items-center justify-center text-gray-500 hover:bg-white/10 hover:text-white transition-all cursor-pointer group relative overflow-hidden"
              >
                {formData.business.logoUrl ? (
                  <img
                    src={formData.business.logoUrl}
                    alt="Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <>
                    {isUploading ? (
                      <RefreshCw className="w-6 h-6 animate-spin text-green-500" />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 mb-2 group-hover:-translate-y-1 transition-transform" />
                        <span className="text-xs font-medium">Logo</span>
                      </>
                    )}
                  </>
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium text-white">Business Logo</h3>
                <p className="text-xs text-gray-400 mt-1 mb-3">
                  Recommended size: 512x512px. Max 2MB.
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-4 py-2 rounded-lg bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-all disabled:opacity-50"
                >
                  {isUploading ? 'Uploading...' : 'Upload Image'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField
                label="Turf Name"
                value={formData.business.turfName}
                onChange={(v: any) => updateSection('business', 'turfName', v)}
              />
              <InputField
                label="Owner Name"
                value={formData.business.ownerName}
                onChange={(v: any) => updateSection('business', 'ownerName', v)}
              />
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.business.email}
                  disabled
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-gray-500 text-sm font-semibold select-none cursor-not-allowed"
                />
              </div>
              <InputField
                label="Phone Number"
                value={formData.business.phone}
                onChange={(v: any) => updateSection('business', 'phone', v)}
                error={phoneError}
              />
              <div className="md:col-span-2">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Complete Address
                    </label>
                    <button
                      type="button"
                      onClick={handleDetectLocation}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs font-medium border border-green-500/20 transition-all"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      Detect My Location
                    </button>
                  </div>
                  <textarea
                    value={formData.business.address}
                    onChange={(e) => updateSection('business', 'address', e.target.value)}
                    rows={2}
                    placeholder="E.g., 123 Turf Avenue, Sector 4..."
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50 focus:bg-white/10 transition-all resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Booking Settings */}
        <section className="bg-[#0a0f0a] border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/8 flex items-center gap-3">
            <CalendarClock className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Booking Settings</h2>
          </div>
          <div className="p-6 space-y-6">
            <Toggle
              label="Auto-Accept Bookings"
              description="Automatically confirm bookings when payment is received."
              checked={formData.booking.autoAccept}
              onChange={(v: boolean) => updateSection('booking', 'autoAccept', v)}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Cancellation Policy
                </label>
                <select
                  value={formData.booking.cancellationPolicy}
                  onChange={(e) => updateSection('booking', 'cancellationPolicy', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-green-500/50"
                >
                  <option className="text-black bg-white" value="flexible">
                    Flexible (Cancel anytime)
                  </option>
                  <option className="text-black bg-white" value="24_hours">
                    Moderate (Free up to 24 hours)
                  </option>
                  <option className="text-black bg-white" value="strict">
                    Strict (No refunds)
                  </option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Booking Buffer Time
                </label>
                <select
                  value={formData.booking.bufferTime}
                  onChange={(e) => updateSection('booking', 'bufferTime', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-green-500/50"
                >
                  <option className="text-black bg-white" value="0">
                    No Buffer
                  </option>
                  <option className="text-black bg-white" value="15_mins">
                    15 Minutes
                  </option>
                  <option className="text-black bg-white" value="30_mins">
                    30 Minutes
                  </option>
                  <option className="text-black bg-white" value="1_hour">
                    1 Hour
                  </option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Maximum Players limit
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.booking.maxPlayers}
                  onChange={(e) =>
                    updateSection('booking', 'maxPlayers', Number(e.target.value) || 12)
                  }
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-green-500/50"
                  placeholder="e.g. 12"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 4. Notifications */}
        <section className="bg-[#0a0f0a] border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/8 flex items-center gap-3">
            <Bell className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Notifications</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Toggle
              label="Booking Notifications"
              description="Receive alerts for new bookings."
              checked={formData.notifications.booking}
              onChange={(v: boolean) => updateSection('notifications', 'booking', v)}
            />
            <Toggle
              label="Payment Notifications"
              description="Receive alerts for payouts."
              checked={formData.notifications.payment}
              onChange={(v: boolean) => updateSection('notifications', 'payment', v)}
            />
            <Toggle
              label="Email Notifications"
              description="Daily summaries and updates."
              checked={formData.notifications.email}
              onChange={(v: boolean) => updateSection('notifications', 'email', v)}
            />
            <Toggle
              label="SMS Notifications"
              description="Instant text message alerts."
              checked={formData.notifications.sms}
              onChange={(v: boolean) => updateSection('notifications', 'sms', v)}
            />
          </div>
        </section>

        {/* 5. Security */}
        <section className="bg-[#0a0f0a] border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/8 flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-teal-400" />
            <h2 className="text-lg font-semibold text-white">Security</h2>
          </div>
          <div className="p-6 space-y-4">
            {/* Password row - opens inline modal */}
            <div className="flex flex-col gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-teal-400" /> Password
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Change your account password securely.
                  </p>
                </div>
                <button
                  onClick={() => setShowPasswordModal(!showPasswordModal)}
                  className="px-4 py-2 rounded-lg bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-all whitespace-nowrap"
                >
                  {showPasswordModal ? 'Cancel' : 'Update Password'}
                </button>
              </div>
              {/* Inline Password Form */}
              {showPasswordModal && (
                <div className="pt-2 border-t border-white/8 space-y-3">
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      placeholder="New Password (min 12 characters)"
                      value={passwordFields.newPassword}
                      onChange={(e) =>
                        setPasswordFields((p) => ({ ...p, newPassword: e.target.value }))
                      }
                      className="w-full px-4 py-2.5 pr-10 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/50 text-sm font-semibold"
                    />
                    <button
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {passwordFields.newPassword && (
                    <div className="space-y-1.5 px-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-gray-400">Password Strength:</span>
                        <span
                          className={`font-bold ${
                            passwordStrength === 'Weak'
                              ? 'text-red-400'
                              : passwordStrength === 'Medium'
                                ? 'text-yellow-400'
                                : 'text-green-400'
                          }`}
                        >
                          {passwordStrength}
                        </span>
                      </div>
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden flex gap-0.5">
                        <div
                          className={`h-full transition-all duration-300 ${
                            passwordStrength === 'Weak'
                              ? 'w-1/3 bg-red-400'
                              : passwordStrength === 'Medium'
                                ? 'w-2/3 bg-yellow-400'
                                : 'w-full bg-green-500'
                          }`}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-gray-400 pt-1">
                        <div
                          className={`flex items-center gap-1 ${passwordChecks.length ? 'text-green-400 font-bold' : 'text-gray-500'}`}
                        >
                          <span>{passwordChecks.length ? '✓' : '•'}</span> At least 12 chars
                        </div>
                        <div
                          className={`flex items-center gap-1 ${passwordChecks.upper ? 'text-green-400 font-bold' : 'text-gray-500'}`}
                        >
                          <span>{passwordChecks.upper ? '✓' : '•'}</span> One uppercase letter
                        </div>
                        <div
                          className={`flex items-center gap-1 ${passwordChecks.lower ? 'text-green-400 font-bold' : 'text-gray-500'}`}
                        >
                          <span>{passwordChecks.lower ? '✓' : '•'}</span> One lowercase letter
                        </div>
                        <div
                          className={`flex items-center gap-1 ${passwordChecks.number ? 'text-green-400 font-bold' : 'text-gray-500'}`}
                        >
                          <span>{passwordChecks.number ? '✓' : '•'}</span> One number
                        </div>
                        <div
                          className={`flex items-center gap-1 ${passwordChecks.special ? 'text-green-400 font-bold' : 'text-gray-500'}`}
                        >
                          <span>{passwordChecks.special ? '✓' : '•'}</span> One special character
                        </div>
                        <div
                          className={`flex items-center gap-1 ${passwordChecks.notCommon ? 'text-green-400 font-bold' : 'text-gray-500'}`}
                        >
                          <span>{passwordChecks.notCommon ? '✓' : '•'}</span> Not common password
                        </div>
                      </div>
                    </div>
                  )}

                  <input
                    type="password"
                    placeholder="Confirm New Password"
                    value={passwordFields.confirmPassword}
                    onChange={(e) =>
                      setPasswordFields((p) => ({ ...p, confirmPassword: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/50 text-sm font-semibold"
                  />
                  <button
                    onClick={handleUpdatePassword}
                    disabled={
                      isPasswordSaving ||
                      passwordStrength !== 'Strong' ||
                      passwordFields.newPassword !== passwordFields.confirmPassword
                    }
                    className="w-full py-2.5 rounded-xl bg-teal-500 text-black text-xs font-bold hover:bg-teal-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isPasswordSaving ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Updating...
                      </>
                    ) : (
                      'Save New Password'
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 6. Danger Zone */}
        <section className="bg-[#0a0f0a] border border-red-500/20 rounded-2xl overflow-hidden relative">
          <div className="absolute inset-0 bg-red-500/5 pointer-events-none" />
          <div className="px-6 py-4 border-b border-red-500/20 flex items-center gap-3 relative">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
          </div>
          <div className="p-6 space-y-4 relative">
            {/* Disable Listing */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 rounded-xl bg-red-500/5 border border-red-500/10">
              <div>
                <p className="text-sm font-medium text-red-200">
                  {isListingDisabled ? '🔴 Turf Listing is HIDDEN' : '🟢 Disable Turf Listing'}
                </p>
                <p className="text-xs text-red-400/70 mt-0.5">
                  {isListingDisabled
                    ? 'Your venues are currently hidden. Click to make them live again.'
                    : 'Temporarily hide your venue from customers.'}
                </p>
              </div>
              <button
                onClick={handleToggleListing}
                disabled={isDangerLoading}
                className={`px-4 py-2 rounded-lg border text-xs font-bold transition-all whitespace-nowrap disabled:opacity-50 ${
                  isListingDisabled
                    ? 'border-green-500/40 text-green-400 hover:bg-green-500/10'
                    : 'border-red-500/20 text-red-400 hover:bg-red-500/10'
                }`}
              >
                {isDangerLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin inline" />
                ) : isListingDisabled ? (
                  'Re-enable Listing'
                ) : (
                  'Disable Listing'
                )}
              </button>
            </div>
            {/* Delete Account */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 rounded-xl bg-red-500/5 border border-red-500/10">
              <div>
                <p className="text-sm font-medium text-red-200">Delete Account</p>
                <p className="text-xs text-red-400/70 mt-0.5">
                  Permanently remove your account and all data. Irreversible.
                </p>
              </div>
              <button
                onClick={handleDeleteAccount}
                disabled={isDangerLoading}
                className="px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-all whitespace-nowrap disabled:opacity-50"
              >
                {isDangerLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin inline" />
                ) : (
                  'Delete Account'
                )}
              </button>
            </div>
          </div>
        </section>
        {/* Secondary Inline Save Changes Bar for redundancy */}
        {hasChanges && (
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/8 mt-6">
            <div>
              <p className="text-sm font-semibold text-white">Unsaved Changes</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {emailError || phoneError
                  ? 'Please resolve validation errors before saving.'
                  : 'Click save to apply your profile updates.'}
              </p>
            </div>
            <div className="flex gap-3 w-full sm:w-auto justify-end">
              <button
                onClick={() => setFormData(initialData)}
                className="px-5 py-2.5 rounded-xl border border-white/10 text-gray-300 text-sm font-medium hover:bg-white/5 transition-all w-full sm:w-auto"
              >
                Discard
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !!phoneError}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-green-500 text-black text-sm font-bold hover:bg-green-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-green-500 shadow-lg shadow-green-900/20 w-full sm:w-auto"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Save Bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 md:left-64 bg-[#0a0f0a]/80 backdrop-blur-xl border-t border-white/10 p-4 flex items-center justify-between z-50 transition-transform duration-300 ${
          hasChanges ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <p className="text-sm font-medium text-gray-300 ml-4 hidden sm:block">
          {phoneError ? 'Resolve validation errors before saving' : 'You have unsaved changes'}
        </p>
        <div className="flex gap-3 ml-auto mr-4">
          <button
            onClick={() => setFormData(initialData)}
            className="px-5 py-2.5 rounded-xl border border-white/10 text-gray-300 text-sm font-medium hover:bg-white/5 transition-all"
          >
            Discard
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !!phoneError}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-green-500 text-black text-sm font-bold hover:bg-green-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-green-500 shadow-lg shadow-green-900/20"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Changes
              </>
            )}
          </button>
        </div>
      </div>

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
    </div>
  )
}
