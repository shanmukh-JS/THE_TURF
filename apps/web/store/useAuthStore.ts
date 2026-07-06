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

// Initialize auth by calling a server-side API route.
// This bypasses the HttpOnly cookie restriction that prevents the browser
// Supabase client from reading the session on Vercel deployments.
if (typeof window !== 'undefined') {
  const initAuth = async () => {
    try {
      const res = await fetch('/api/auth/session')
      const { user } = await res.json()

      if (user) {
        useAuthStore.getState().setUser(user)
      } else {
        useAuthStore.getState().setLoading(false)
      }
    } catch (e) {
      console.error('Auth initialization error:', e)
      useAuthStore.getState().setLoading(false)
    }
  }

  initAuth()

  // Listen for login/logout events from the Supabase client
  supabase.auth.onAuthStateChange(async (event, session) => {
    try {
      if (event === 'SIGNED_OUT' || !session) {
        useAuthStore.getState().setUser(null)
        return
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Set local user details immediately to make UI responsive
        const localUser = {
          id: session.user.id,
          email: session.user.email!,
          role: session.user.user_metadata?.role || 'CUSTOMER',
          fullName: session.user.user_metadata?.full_name,
        }
        useAuthStore.getState().setUser(localUser)

        // Re-fetch from server to get full user profile including logoUrl in background
        const res = await fetch('/api/auth/session')
        const { user } = await res.json()
        if (user) {
          useAuthStore.getState().setUser(user)
        }
      }
    } catch (e) {
      console.error('Auth state change error:', e)
      useAuthStore.getState().setLoading(false)
    }
  })
}
