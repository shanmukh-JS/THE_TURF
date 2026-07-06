'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '../../store/useAuthStore'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    // Optionally: fetch user profile to verify token if token exists
  }, [])

  if (!isMounted) {
    return <>{children}</>
  }

  return <>{children}</>
}
