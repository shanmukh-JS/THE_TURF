'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRealtimeTable } from '@/hooks/useRealtime'
import { createClient } from '@/lib/supabase/client'
import NotificationToast from './NotificationToast'

const MAX_VISIBLE_TOASTS = 3

interface QueuedToast {
  id: string
  title: string
  message: string
  category: string
  priority: string
  icon: string
  color: string
  actionButton?: boolean
  actionText?: string
  metadata?: any
}

export const NotificationToastContainer: React.FC = () => {
  const [visibleToasts, setVisibleToasts] = useState<QueuedToast[]>([])
  const queueRef = useRef<QueuedToast[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUserId(data.user.id)
    })
  }, [])

  // Process queue: promote queued toasts to visible when slots open
  const processQueue = useCallback(() => {
    setVisibleToasts((prev) => {
      if (prev.length < MAX_VISIBLE_TOASTS && queueRef.current.length > 0) {
        const slotsAvailable = MAX_VISIBLE_TOASTS - prev.length
        const toPromote = queueRef.current.splice(0, slotsAvailable)
        return [...prev, ...toPromote]
      }
      return prev
    })
  }, [])

  // Listen to in-app notifications insert event in real-time
  useRealtimeTable('notifications', userId ? `user_id=eq.${userId}` : undefined, (event) => {
    if (event.eventType === 'INSERT') {
      const notif = event.new as any
      const toast: QueuedToast = {
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
      }

      // If we have room, add directly; otherwise queue
      setVisibleToasts((prev) => {
        if (prev.length < MAX_VISIBLE_TOASTS) {
          return [...prev, toast]
        }
        queueRef.current.push(toast)
        return prev
      })
    }
  })

  const handleClose = (id: string) => {
    setVisibleToasts((prev) => prev.filter((t) => t.id !== id))
    // Give React a tick to update, then process queue
    setTimeout(processQueue, 50)
  }

  return (
    <div
      className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-auto w-[calc(100vw-2.5rem)] max-w-96 sm:w-96"
      aria-live="polite"
      aria-label="Notification alerts"
    >
      {visibleToasts.map((toast) => (
        <NotificationToast key={toast.id} {...toast} onClose={handleClose} />
      ))}
    </div>
  )
}

export default NotificationToastContainer
