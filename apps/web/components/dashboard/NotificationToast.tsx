'use client'

import React, { useEffect, useState } from 'react'
import * as Lucide from 'lucide-react'
import Link from 'next/link'

export interface ToastProps {
  id: string
  title: string
  message: string
  category: string
  priority: string
  icon?: string
  color?: string
  actionButton?: boolean
  actionText?: string
  metadata?: any
  onClose: (id: string) => void
}

/**
 * Shared AudioContext singleton — avoids creating a new context per toast.
 */
let sharedAudioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  try {
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return sharedAudioCtx
  } catch {
    return null
  }
}

/**
 * Check if user prefers reduced motion.
 */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export const NotificationToast: React.FC<ToastProps> = ({
  id,
  title,
  message,
  category,
  priority,
  icon = 'Bell',
  color = 'bg-zinc-900 border-zinc-800 text-white',
  actionButton,
  actionText = 'View',
  metadata,
  onClose,
}) => {
  const [progress, setProgress] = useState(100)
  const [isLeaving, setIsLeaving] = useState(false)
  const reducedMotion = prefersReducedMotion()

  // Dynamically load the correct Lucide icon
  const IconComponent = (Lucide as any)[icon] || Lucide.Bell

  // Expiration countdown
  useEffect(() => {
    const duration = priority === 'CRITICAL' ? 10000 : 5000

    // Play sound effect (only if not reduced-motion)
    if (!reducedMotion) {
      const audioCtx = getAudioContext()
      if (audioCtx) {
        try {
          const osc = audioCtx.createOscillator()
          const gain = audioCtx.createGain()

          // Xbox/Achievement bell pitch sequence for gamification events
          if (category === 'XP' || category === 'LEVELS' || category === 'ACHIEVEMENTS') {
            osc.type = 'triangle'
            osc.frequency.setValueAtTime(523.25, audioCtx.currentTime) // C5
            osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1) // E5
            osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2) // G5
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4)
          } else {
            osc.type = 'sine'
            osc.frequency.setValueAtTime(440, audioCtx.currentTime) // A4
            gain.gain.setValueAtTime(0.08, audioCtx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2)
          }

          osc.connect(gain)
          gain.connect(audioCtx.destination)
          osc.start()
          osc.stop(audioCtx.currentTime + 0.5)
        } catch {
          // AudioContext might be blocked by browser user interaction policy
        }
      }
    }

    // Skip animation progress bar if reduced motion
    if (reducedMotion) {
      const timeout = setTimeout(() => onClose(id), duration)
      return () => clearTimeout(timeout)
    }

    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(remaining)

      if (elapsed >= duration) {
        clearInterval(interval)
        triggerDismiss()
      }
    }, 30)

    return () => clearInterval(interval)
  }, [priority, category, reducedMotion])

  const triggerDismiss = () => {
    setIsLeaving(true)
    setTimeout(
      () => {
        onClose(id)
      },
      reducedMotion ? 0 : 300
    )
  }

  const isXp = category === 'XP' || category === 'LEVELS'
  const progressPercent = metadata?.xpEarned
    ? Math.min(100, Math.max(0, (metadata.currentXp % 1000) / 10))
    : 0

  return (
    <div
      role="alert"
      aria-label={`${category} notification: ${title}`}
      className={`relative w-full rounded-2xl border p-4 shadow-2xl backdrop-blur-md cursor-pointer ${
        reducedMotion
          ? ''
          : `transition-all duration-300 transform ${
              isLeaving
                ? 'translate-x-full opacity-0 scale-95'
                : 'translate-x-0 opacity-100 scale-100'
            }`
      } ${color}`}
      onClick={triggerDismiss}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === 'Escape') triggerDismiss()
      }}
    >
      <div className="flex gap-3">
        {/* Glow effect matching priority */}
        <div className="absolute inset-0 rounded-2xl opacity-10 blur-xl bg-current pointer-events-none" />

        {/* Icon slot */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
          <IconComponent className={`h-5 w-5 ${reducedMotion ? '' : 'animate-pulse'}`} />
        </div>

        {/* Title, message & CTAs */}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold tracking-wide text-sm">{title}</h4>
            <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">
              {category}
            </span>
          </div>
          <p className="mt-1 text-xs opacity-80 leading-relaxed">{message}</p>

          {/* Gamified floating XP gauge progression bar */}
          {isXp && metadata?.xpEarned && (
            <div className="mt-3 bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-yellow-400 h-full rounded-full transition-all duration-1000"
                style={{ width: `${progressPercent}%` }}
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
              />
              <span className="text-[9px] text-yellow-400 font-bold mt-1 block">
                Level {metadata.nextLevel - 1} Progress: {metadata.currentXp % 1000}/1000 XP
              </span>
            </div>
          )}

          {/* Deep link action button */}
          {actionButton && metadata?.deepLink && (
            <div className="mt-3 flex justify-end">
              <Link
                href={metadata.deepLink}
                className="rounded-lg bg-white/15 px-3 py-1 text-[11px] font-bold hover:bg-white/25 transition"
                onClick={(e) => e.stopPropagation()}
              >
                {actionText}
              </Link>
            </div>
          )}
        </div>

        <button
          className="shrink-0 opacity-50 hover:opacity-100 transition"
          onClick={(e) => {
            e.stopPropagation()
            triggerDismiss()
          }}
          aria-label="Dismiss notification"
        >
          <Lucide.X className="h-4 w-4" />
        </button>
      </div>

      {/* Slide timer bar */}
      {!reducedMotion && (
        <div
          className="absolute bottom-0 left-0 h-1 bg-current opacity-40 rounded-b-2xl transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      )}
    </div>
  )
}

export default NotificationToast
