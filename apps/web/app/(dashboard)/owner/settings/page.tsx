'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
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
} from 'lucide-react'

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
  },

  notifications: {
    booking: true,
    payment: true,
    email: true,
    sms: false,
  },
}

export default function OwnerSettingsPage() {
  const [formData, setFormData] = useState(defaultSettings)
  const [initialData, setInitialData] = useState(defaultSettings)
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true)
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) return

        const { data: profile } = await supabase
          .from('owner_profiles')
          .select('id, full_name, business_name')
          .eq('user_id', userData.user.id)
          .single()

        if (!profile) return

        const { data: settings } = await supabase
          .from('owner_settings')
          .select('*')
          .eq('owner_id', profile.id)
          .maybeSingle()

        const mappedData = {
          business: {
            turfName: profile.business_name || '',
            ownerName: profile.full_name || '',
            email: settings?.business_email || userData.user.email || '',
            phone: settings?.business_phone || userData.user.phone || '',
            address: settings?.business_address || '',
            logoUrl: settings?.business_logo_url || '',
          },
          booking: {
            autoAccept: settings ? settings.auto_accept_bookings : true,
            cancellationPolicy: settings?.cancellation_policy || 'flexible',
            bufferTime: settings?.booking_buffer_time || '0',
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
      } catch (e) {
        console.error('Error loading settings:', e)
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [])

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
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Not logged in')

      const { data: profile } = await supabase
        .from('owner_profiles')
        .select('id')
        .eq('user_id', userData.user.id)
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
        business_email: formData.business.email,
        business_phone: formData.business.phone,
        business_address: formData.business.address,
        business_logo_url: formData.business.logoUrl,

        auto_accept_bookings: formData.booking.autoAccept,
        cancellation_policy: formData.booking.cancellationPolicy,
        booking_buffer_time: formData.booking.bufferTime,

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

      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Not logged in')

      const fileExt = file.name.split('.').pop()
      const fileName = `${userData.user.id}-${Date.now()}.${fileExt}`
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

  const handleUpdatePassword = async () => {
    const newPassword = window.prompt('Enter your new password (minimum 6 characters):')
    if (!newPassword) return
    if (newPassword.length < 6) {
      setToast({ message: 'Password must be at least 6 characters long', type: 'error' })
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setToast({ message: 'Password updated successfully!', type: 'success' })
    } catch (e: any) {
      setToast({ message: e.message || 'Error updating password', type: 'error' })
    }
  }

  const handleNotImplemented = (feature: string) => {
    setToast({
      message: `${feature} is coming soon! Please contact support for manual processing.`,
      type: 'error',
    })
  }

  const InputField = ({ label, value, onChange, type = 'text', placeholder = '' }: any) => (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50 focus:bg-white/10 transition-all"
      />
    </div>
  )

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
              <InputField
                label="Email Address"
                type="email"
                value={formData.business.email}
                onChange={(v: any) => updateSection('business', 'email', v)}
              />
              <InputField
                label="Phone Number"
                value={formData.business.phone}
                onChange={(v: any) => updateSection('business', 'phone', v)}
              />
              <div className="md:col-span-2">
                <InputField
                  label="Complete Address"
                  value={formData.business.address}
                  onChange={(v: any) => updateSection('business', 'address', v)}
                />
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
              <div>
                <p className="text-sm font-medium text-white">Password</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Change your account password securely.
                </p>
              </div>
              <button
                onClick={handleUpdatePassword}
                className="px-4 py-2 rounded-lg bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-all whitespace-nowrap"
              >
                Update Password
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
              <div>
                <p className="text-sm font-medium text-white">Two-Factor Authentication (2FA)</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Add an extra layer of security to your account.
                </p>
              </div>
              <button
                onClick={() => handleNotImplemented('2FA Setup')}
                className="px-4 py-2 rounded-lg bg-green-500/10 text-green-400 text-xs font-medium hover:bg-green-500/20 transition-all whitespace-nowrap"
              >
                Enable 2FA
              </button>
            </div>
          </div>
        </section>

        {/* 6. Danger Zone */}
        <section className="bg-[#0a0f0a] border border-red-500/20 rounded-2xl overflow-hidden relative overflow-hidden">
          <div className="absolute inset-0 bg-red-500/5 pointer-events-none" />
          <div className="px-6 py-4 border-b border-red-500/20 flex items-center gap-3 relative">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
          </div>
          <div className="p-6 space-y-4 relative">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 rounded-xl bg-red-500/5 border border-red-500/10">
              <div>
                <p className="text-sm font-medium text-red-200">Disable Turf Listing</p>
                <p className="text-xs text-red-400/70 mt-0.5">
                  Temporarily hide your venue from customers.
                </p>
              </div>
              <button
                onClick={() => handleNotImplemented('Listing pause functionality')}
                className="px-4 py-2 rounded-lg border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/10 transition-all whitespace-nowrap"
              >
                Disable Listing
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 rounded-xl bg-red-500/5 border border-red-500/10">
              <div>
                <p className="text-sm font-medium text-red-200">Delete Account</p>
                <p className="text-xs text-red-400/70 mt-0.5">
                  Permanently remove your account and all data.
                </p>
              </div>
              <button
                onClick={() => handleNotImplemented('Account deletion')}
                className="px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-all whitespace-nowrap"
              >
                Delete Account
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Sticky Save Bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 md:left-64 bg-[#0a0f0a]/80 backdrop-blur-xl border-t border-white/10 p-4 flex items-center justify-between z-50 transition-transform duration-300 ${
          hasChanges ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <p className="text-sm font-medium text-gray-300 ml-4 hidden sm:block">
          You have unsaved changes
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
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-green-500 text-black text-sm font-bold hover:bg-green-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-900/20"
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
