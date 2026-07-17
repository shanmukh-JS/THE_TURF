'use client'

import React, { useState, useEffect } from 'react'
import { useRealtimeTable } from '@/hooks/useRealtime'
import { createClient } from '@/lib/supabase/client'
import NotificationToast from './NotificationToast'

export const NotificationToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<any[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUserId(data.user.id)
    })
  }, [])

  // Listen to in-app notifications insert event in real-time
  useRealtimeTable('notifications', userId ? `user_id=eq.${userId}` : undefined, (event) => {
    if (event.eventType === 'INSERT') {
      const notif = event.new as any

      // Push notification alerts to active screen overlays
      setToasts((prev) => [
        ...prev,
        {
          id: notif.id,
          title: notif.title,
          message: notif.message,
          category: notif.category || 'SYSTEM',
          priority: notif.priority || 'MEDIUM',
          icon: notif.icon || 'Bell',
          color: notif.color || 'bg-zinc-900 border-zinc-800 text-white',
          actionButton: notif.action_button,
          actionText: notif.action_text,
          metadata: notif.metadata,
        },
      ])
    }
  })

  const handleClose = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-auto">
      {toasts.map((toast) => (
        <NotificationToast key={toast.id} {...toast} onClose={handleClose} />
      ))}
    </div>
  )
}

export default NotificationToastContainer
