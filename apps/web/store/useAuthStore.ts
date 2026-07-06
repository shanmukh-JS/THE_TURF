import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export interface User {
  id: string
  email: string
  role: string
  fullName?: string
  logoUrl?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  setUser: (user: User | null) => void
  setLoading: (isLoading: boolean) => void
  setLogoUrl: (url: string) => void
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
  setLogoUrl: (url) =>
    set((state) => ({ user: state.user ? { ...state.user, logoUrl: url } : null })),
  setLoading: (isLoading) => set({ isLoading }),
  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null, isAuthenticated: false })
  },
}))

const fetchUserLogo = async (user: any) => {
  if (user.user_metadata?.role !== 'OWNER') return undefined
  try {
    const { data: profile } = await supabase
      .from('owner_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()
    if (!profile) return undefined

    const { data: settings } = await supabase
      .from('owner_settings')
      .select('business_logo_url')
      .eq('owner_id', profile.id)
      .maybeSingle()

    return settings?.business_logo_url || undefined
  } catch (e) {
    return undefined
  }
}

// Initialize auth listener
if (typeof window !== 'undefined') {
  const initAuth = async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()
      if (error) throw error

      if (user) {
        const logoUrl = await fetchUserLogo(user)
        useAuthStore.getState().setUser({
          id: user.id,
          email: user.email!,
          role: user.user_metadata?.role || 'CUSTOMER',
          fullName: user.user_metadata?.full_name,
          logoUrl,
        })
      } else {
        useAuthStore.getState().setLoading(false)
      }
    } catch (e) {
      console.error('Auth initialization error:', e)
      useAuthStore.getState().setLoading(false)
    }
  }

  initAuth()

  // Listen for changes
  supabase.auth.onAuthStateChange(async (_event, session) => {
    try {
      if (session?.user) {
        const user = session.user
        const logoUrl = await fetchUserLogo(user)
        useAuthStore.getState().setUser({
          id: user.id,
          email: user.email!,
          role: user.user_metadata?.role || 'CUSTOMER',
          fullName: user.user_metadata?.full_name,
          logoUrl,
        })
      } else {
        useAuthStore.getState().setUser(null)
      }
    } catch (e) {
      console.error('Auth state change error:', e)
      useAuthStore.getState().setLoading(false)
    }
  })
}
