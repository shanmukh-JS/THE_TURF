'use client'

import { useAuthStore } from '@/store/useAuthStore'
import { useEffect, useState } from 'react'

export function ClientGreeting() {
  const { user } = useAuthStore()
  const [greeting, setGreeting] = useState('Good evening')

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 18) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

  // If user is not yet loaded in client store, show generic
  const firstName = user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Owner'

  return (
    <h1 className="text-2xl font-bold text-white transition-opacity duration-300">
      {greeting}, {firstName} 👋
    </h1>
  )
}
