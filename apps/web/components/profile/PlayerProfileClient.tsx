'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  User,
  Mail,
  Shield,
  CalendarCheck,
  Award,
  Heart,
  Activity,
  X,
  Loader2,
  CheckCircle,
} from 'lucide-react'
import Link from 'next/link'
import {
  DashboardAnimationWrapper,
  DashboardAnimationItem,
} from '@/components/ui/DashboardAnimationWrapper'
import { ImageCropperModal } from '@/components/ui/ImageCropperModal'

interface PlayerProfileClientProps {
  // Supabase dynamic user metadata row cannot be strictly typed without generating complex conditional types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any
  // Supabase customer_profiles row type varies based on joined queries
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customerProfile?: any
  // Bookings payload includes nested relations (venue, slots) that break standard Row mapping
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bookings: any[]
  favoriteTurf: string
  memberSince: string
  role: string
}

export function PlayerProfileClient({
  user,
  customerProfile,
  bookings,
  favoriteTurf,
  memberSince,
  role,
}: PlayerProfileClientProps) {
  const router = useRouter()
  const supabase = createClient()

  // State management
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const [isEditing, setIsEditing] = useState(false)
  const [fullName, setFullName] = useState(
    customerProfile?.full_name || user.user_metadata?.full_name || 'Valued Gamer'
  )
  const [editName, setEditName] = useState(fullName)
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [bannerImage, setBannerImage] = useState<File | null>(null)
  const [removeExistingProfile, setRemoveExistingProfile] = useState(false)
  const [removeExistingBanner, setRemoveExistingBanner] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [cropTarget, setCropTarget] = useState<'profile' | 'banner' | null>(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'profile' | 'banner'
  ) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        setCropImageSrc(reader.result as string)
        setCropTarget(target)
      }
      reader.readAsDataURL(file)
    }
  }

  // Leveling engine parameters
  const totalXp = bookings.length * 250
  const level = Math.min(50, 1 + Math.floor(totalXp / 1000))
  const xp = totalXp % 1000
  const xpTarget = 1000

  const league =
    level >= 41
      ? 'Legendary League'
      : level >= 31
        ? 'Master League'
        : level >= 21
          ? 'Pro League'
          : level >= 11
            ? 'Semi-Pro League'
            : 'Amateur League'

  // Array filter iterates over weakly typed bookings array; strict typing breaks downstream rendering
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matchesPlayed = bookings.filter((b: any) => b.status === 'COMPLETED').length

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editName.trim()) {
      setToast({ message: 'Full name cannot be empty', type: 'error' })
      return
    }

    setLoading(true)
    setToast(null)

    try {
      let profileImageUrl = customerProfile?.profile_image_url || null
      let bannerImageUrl = customerProfile?.banner_image_url || null

      if (removeExistingProfile) {
        profileImageUrl = null
      }
      if (removeExistingBanner) {
        bannerImageUrl = null
      }

      if (profileImage) {
        const fileExt = profileImage.name.split('.').pop()
        const filePath = `${user.id}/profile_${Math.random()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('player_profiles')
          .upload(filePath, profileImage, { upsert: true })
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('player_profiles').getPublicUrl(filePath)
        profileImageUrl = data.publicUrl
      }

      if (bannerImage) {
        const fileExt = bannerImage.name.split('.').pop()
        const filePath = `${user.id}/banner_${Math.random()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('player_profiles')
          .upload(filePath, bannerImage, { upsert: true })
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('player_profiles').getPublicUrl(filePath)
        bannerImageUrl = data.publicUrl
      }

      // 1. Update public.customer_profiles table
      const { error: profileError } = await supabase.from('customer_profiles').upsert(
        {
          user_id: user.id,
          full_name: editName.trim(),
          profile_image_url: profileImageUrl,
          banner_image_url: bannerImageUrl,
        },
        { onConflict: 'user_id' }
      )

      if (profileError) throw profileError

      // 2. Update auth user metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: editName.trim() },
      })

      if (authError) throw authError

      // Update local state and close modal
      setFullName(editName.trim())
      setRemoveExistingProfile(false)
      setRemoveExistingBanner(false)
      setProfileImage(null)
      setBannerImage(null)
      setIsEditing(false)
      setToast({ message: 'Profile updated successfully!', type: 'success' })

      // Refresh page data
      router.refresh()

      // Auto-dismiss toast
      setTimeout(() => setToast(null), 3000)
      // Error payload from Supabase API can be an Error object, PostgrestError, or AuthError
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('Error updating profile:', err)
      setToast({ message: err.message || 'Failed to update profile', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <DashboardAnimationWrapper className="p-8 space-y-8">
        {/* Toast Notification */}
        {toast && (
          <div
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-xl border shadow-xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-5 duration-300 ${
              toast.type === 'success'
                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
            <span className="text-sm font-bold">{toast.message}</span>
          </div>
        )}

        {/* 1. Profile Header with Stadium Cover Banner */}
        <DashboardAnimationItem className="relative rounded-3xl border border-white/8 overflow-hidden bg-black">
          {/* Banner overlay background */}
          <div
            className="h-44 bg-cover bg-center relative"
            style={{
              backgroundImage: `url('${customerProfile?.banner_image_url || 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=1200&auto=format&fit=crop'}')`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          </div>

          {/* Profile Identity overlay */}
          <div className="px-8 pb-6 flex flex-col sm:flex-row sm:items-end gap-5 -mt-10 relative z-10">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl blur opacity-30" />
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#0f240f] to-green-950 border-2 border-green-500/40 flex items-center justify-center text-4xl font-extrabold text-green-400 relative overflow-hidden">
                {customerProfile?.profile_image_url ? (
                  <img
                    src={customerProfile.profile_image_url}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  fullName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-green-500 border-2 border-black flex items-center justify-center text-xs font-black text-black shadow-lg">
                {level}
              </div>
            </div>

            <div className="space-y-1 flex-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-none">
                {fullName}
              </h1>
              <p className="text-sm text-gray-400">{user.email}</p>
              <div className="text-[10px] uppercase font-bold tracking-widest text-green-400 mt-2 bg-green-500/10 border border-green-500/20 px-2.5 py-0.5 rounded w-fit">
                Level {level} · {league}
              </div>
            </div>

            <button
              onClick={() => {
                setEditName(fullName)
                setIsEditing(true)
              }}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold border border-white/8 text-xs uppercase tracking-wider transition-all sm:self-end active:scale-98"
            >
              Edit Profile
            </button>
          </div>
        </DashboardAnimationItem>

        {/* Profile Metrics Grid */}
        <div className="grid gap-8 md:grid-cols-3">
          {/* Left Column: XP and Bio Details */}
          <div className="md:col-span-2 space-y-8">
            {/* XP Progress Bar */}
            <DashboardAnimationItem className="rounded-2xl border border-white/8 bg-white/[0.02] p-6 space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                    Leveling Progress
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">Keep playing to unlock new leagues</p>
                </div>
                <span className="text-sm font-mono text-green-400 font-bold">
                  {xp} / {xpTarget} XP
                </span>
              </div>
              <div className="w-full h-3 bg-white/5 border border-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-1000"
                  style={{ width: `${(xp / xpTarget) * 100}%` }}
                />
              </div>
            </DashboardAnimationItem>

            {/* Bio Account details */}
            <DashboardAnimationItem className="rounded-2xl border border-white/8 bg-white/[0.02] p-6 space-y-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-green-400" />
                Account Details
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">
                    Full Name
                  </label>
                  <div className="text-white text-sm font-semibold bg-black/40 px-4 py-3 rounded-xl border border-white/5">
                    {fullName}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">
                    Email Address
                  </label>
                  <div className="text-white text-sm font-semibold bg-black/40 px-4 py-3 rounded-xl border border-white/5 truncate">
                    {user.email}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">
                    Member Since
                  </label>
                  <div className="text-white text-sm font-semibold bg-black/40 px-4 py-3 rounded-xl border border-white/5">
                    {memberSince}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">
                    Platform Role
                  </label>
                  <div className="text-white text-sm font-semibold bg-black/40 px-4 py-3 rounded-xl border border-white/5 capitalize">
                    {role.toLowerCase()}
                  </div>
                </div>
              </div>
            </DashboardAnimationItem>
          </div>

          {/* Right Column: Statistics */}
          <DashboardAnimationItem className="space-y-6">
            {/* Quick Statistics Widget */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6 space-y-5">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                Player Statistics
              </h3>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 border border-green-500/20">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-white font-extrabold text-base">{matchesPlayed}</h4>
                    <p className="text-[10px] text-gray-500 uppercase font-semibold">
                      Matches Played
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 border border-red-500/20">
                    <Heart className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-white font-extrabold text-sm truncate">{favoriteTurf}</h4>
                    <p className="text-[10px] text-gray-500 uppercase font-semibold">
                      Favorite Turf
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-400 border border-yellow-500/20">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-white font-extrabold text-base capitalize">
                      {league.split(' ')[0]}
                    </h4>
                    <p className="text-[10px] text-gray-500 uppercase font-semibold">
                      Current League
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bookings shortcut */}
            <Link
              href="/player/bookings"
              className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.04] hover:border-green-500/30 transition-all p-5 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 group-hover:bg-green-500 group-hover:text-black transition-colors">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="text-white font-bold text-sm">My Bookings</h3>
                  <p className="text-xs text-gray-500">View your reservations</p>
                </div>
              </div>
              <div className="text-gray-600 group-hover:text-white transition-colors">→</div>
            </Link>
          </DashboardAnimationItem>
        </div>
      </DashboardAnimationWrapper>

      {/* Edit Profile Modal (Portalled to document.body to ensure absolute z-index stacking above sticky layouts) */}
      {mounted &&
        isEditing &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-[#0a0f0a] border border-white/10 rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
              <button
                onClick={() => setIsEditing(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Edit Profile</h3>
                  <p className="text-xs text-gray-500">Update your account details below</p>
                </div>

                <form onSubmit={handleSave} className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-400 uppercase tracking-widest block font-semibold">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      disabled={loading}
                      placeholder="Enter your name"
                      className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all font-semibold"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] text-gray-400 uppercase tracking-widest block font-semibold">
                        Profile Image{' '}
                        {profileImage && (
                          <span className="text-green-400 lowercase normal-case">
                            (Ready to upload)
                          </span>
                        )}
                        {removeExistingProfile && (
                          <span className="text-red-400 lowercase normal-case">
                            (Will be removed)
                          </span>
                        )}
                      </label>
                      {profileImage && (
                        <button
                          type="button"
                          onClick={() => setProfileImage(null)}
                          className="text-red-400 hover:text-red-300 text-xs font-bold focus:outline-none"
                        >
                          Clear Staged
                        </button>
                      )}
                      {customerProfile?.profile_image_url && !profileImage && (
                        <button
                          type="button"
                          onClick={() => setRemoveExistingProfile(!removeExistingProfile)}
                          className="text-red-400 hover:text-red-300 text-[10px] font-bold uppercase tracking-wider focus:outline-none"
                        >
                          {removeExistingProfile ? 'Keep Image' : 'Remove Image'}
                        </button>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSelect(e, 'profile')}
                      disabled={loading}
                      className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-green-500/20 file:text-green-400 hover:file:bg-green-500/30"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] text-gray-400 uppercase tracking-widest block font-semibold">
                        Banner Background{' '}
                        {bannerImage && (
                          <span className="text-green-400 lowercase normal-case">
                            (Ready to upload)
                          </span>
                        )}
                        {removeExistingBanner && (
                          <span className="text-red-400 lowercase normal-case">
                            (Will be removed)
                          </span>
                        )}
                      </label>
                      {bannerImage && (
                        <button
                          type="button"
                          onClick={() => setBannerImage(null)}
                          className="text-red-400 hover:text-red-300 text-xs font-bold focus:outline-none"
                        >
                          Clear Staged
                        </button>
                      )}
                      {customerProfile?.banner_image_url && !bannerImage && (
                        <button
                          type="button"
                          onClick={() => setRemoveExistingBanner(!removeExistingBanner)}
                          className="text-red-400 hover:text-red-300 text-[10px] font-bold uppercase tracking-wider focus:outline-none"
                        >
                          {removeExistingBanner ? 'Keep Banner' : 'Remove Banner'}
                        </button>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSelect(e, 'banner')}
                      disabled={loading}
                      className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-green-500/20 file:text-green-400 hover:file:bg-green-500/30"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-400 uppercase tracking-widest block font-semibold">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      className="w-full px-4 py-3 rounded-xl bg-black/20 border border-white/5 text-gray-500 text-sm font-semibold select-none cursor-not-allowed"
                    />
                    <p className="text-[10px] text-gray-600 italic">
                      Email addresses cannot be modified on this plan.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      disabled={loading}
                      className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-wider transition-all active:scale-98"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-black text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-98"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Crop Modal (Portalled to document.body) */}
      {mounted &&
        cropImageSrc &&
        cropTarget &&
        createPortal(
          <ImageCropperModal
            imageSrc={cropImageSrc}
            aspectRatio={cropTarget === 'profile' ? 1 : 3}
            isCircular={cropTarget === 'profile'}
            onCancel={() => {
              setCropImageSrc(null)
              setCropTarget(null)
            }}
            onCropComplete={(croppedFile) => {
              if (cropTarget === 'profile') setProfileImage(croppedFile)
              if (cropTarget === 'banner') setBannerImage(croppedFile)
              setCropImageSrc(null)
              setCropTarget(null)
            }}
          />,
          document.body
        )}
    </>
  )
}
