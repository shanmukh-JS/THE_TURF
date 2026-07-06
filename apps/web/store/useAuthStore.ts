import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export interface User {
  id: string
  email: string
  role: string
  fullName?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  setUser: (user: User | null) => void
  setLoading: (isLoading: boolean) => void
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null, isAuthenticated: false })
  },
}))

// Initialize auth listener
if (typeof window !== 'undefined') {
  // Check initial session
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      const user = session.user
      useAuthStore.getState().setUser({
        id: user.id,
        email: user.email!,
        role: user.user_metadata?.role || 'CUSTOMER',
        fullName: user.user_metadata?.full_name,
      })
    } else {
      useAuthStore.getState().setLoading(false)
    }
  })

  // Listen for changes
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      const user = session.user
      useAuthStore.getState().setUser({
        id: user.id,
        email: user.email!,
        role: user.user_metadata?.role || 'CUSTOMER',
        fullName: user.user_metadata?.full_name,
      })
    } else {
      useAuthStore.getState().setUser(null)
    }
  })
}
