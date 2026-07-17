'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, CalendarCheck, CreditCard, Info, ShieldAlert, Check, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useRealtimeTable } from '@/hooks/useRealtime'

const getIconAndColor = (type: string) => {
  switch (type) {
    case 'SUCCESS':
      return { icon: CalendarCheck, color: 'text-green-400 bg-green-500/10' }
    case 'WARNING':
      return { icon: ShieldAlert, color: 'text-amber-400 bg-amber-500/10' }
    case 'ERROR':
      return { icon: ShieldAlert, color: 'text-red-400 bg-red-500/10' }
    case 'BOOKING':
      return { icon: CreditCard, color: 'text-blue-400 bg-blue-500/10' }
    case 'INFO':
    default:
      return { icon: Info, color: 'text-blue-400 bg-blue-500/10' }
  }
}

function timeAgo(dateStr: string) {
  const seconds = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

interface Notification {
  id: string
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
  link?: string
  updated_at?: string
}

interface NotificationListClientProps {
  initialNotifications: Notification[]
  userId: string
}

export function NotificationListClient({
  initialNotifications,
  userId,
}: NotificationListClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [activeCategory, setActiveCategory] = useState('All')
  const [loading, setLoading] = useState(false)

  // Map database type to Category
  const getCategory = (type: string) => {
    if (type === 'BOOKING' || type === 'SUCCESS') return 'Bookings'
    if (type === 'WARNING' || type === 'ERROR') return 'Updates'
    return 'Offers' // INFO or custom types
  }

  // Filter notifications by category
  const filteredNotifications = notifications.filter((n) => {
    if (activeCategory === 'All') return true
    return getCategory(n.type) === activeCategory
  })

  // Mark single notification as read
  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  }

  // Delete single notification
  const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation() // Prevent triggering handleMarkAsRead when clicking delete
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    await supabase.from('notifications').delete().eq('id', id)
  }

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    setLoading(true)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId)
    setLoading(false)
  }

  // Real-time subscription for notifications table
  useRealtimeTable('notifications', userId ? `user_id=eq.${userId}` : undefined, (event) => {
    const { eventType, new: newRow, old: oldRow } = event
    if (eventType === 'INSERT') {
      const newNotif = newRow as Notification
      setNotifications((prev) => {
        if (prev.some((n) => n.id === newNotif.id)) return prev
        return [newNotif, ...prev]
      })
    } else if (eventType === 'UPDATE') {
      const updatedNotif = newRow as Notification
      setNotifications((prev) =>
        prev.map((n) => {
          if (n.id === updatedNotif.id) {
            const serverTime = new Date(updatedNotif.updated_at || '').getTime()
            const localTime = new Date(n.updated_at || '').getTime()
            if (serverTime >= localTime) {
              return { ...n, ...updatedNotif }
            }
          }
          return n
        })
      )
    } else if (eventType === 'DELETE') {
      setNotifications((prev) => prev.filter((n) => n.id !== oldRow.id))
    }
  })

  // Group notifications chronologically
  const groupNotifications = (list: Notification[]) => {
    const today: Notification[] = []
    const yesterday: Notification[] = []
    const thisWeek: Notification[] = []
    const older: Notification[] = []

    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const yesterdayMidnight = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const weekAgoMidnight = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    list.forEach((n) => {
      const nDate = new Date(n.created_at)
      if (nDate >= now) {
        today.push(n)
      } else if (nDate >= yesterdayMidnight) {
        yesterday.push(n)
      } else if (nDate >= weekAgoMidnight) {
        thisWeek.push(n)
      } else {
        older.push(n)
      }
    })

    return { today, yesterday, thisWeek, older }
  }

  const { today, yesterday, thisWeek, older } = groupNotifications(filteredNotifications)

  const renderSection = (title: string, list: Notification[]) => {
    if (list.length === 0) return null
    return (
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">{title}</h3>
        <div className="space-y-2.5">
          {list.map((n) => {
            const { icon: Icon, color } = getIconAndColor(n.type)
            return (
              <motion.div
                layout
                key={n.id}
                onClick={() => {
                  if (!n.is_read) handleMarkAsRead(n.id)
                  if (n.link) router.push(n.link)
                }}
                className={`rounded-2xl border ${
                  n.is_read
                    ? 'border-white/5 bg-white/[0.01]'
                    : 'border-white/10 bg-white/[0.03] shadow-md shadow-green-950/5'
                } p-4 flex gap-4 hover:border-white/15 hover:bg-white/[0.03] transition-all cursor-pointer group`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-start gap-4">
                    <h4
                      className={`text-sm ${
                        n.is_read ? 'text-gray-300 font-semibold' : 'text-white font-extrabold'
                      }`}
                    >
                      {n.title}
                    </h4>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className="text-[10px] text-gray-500 whitespace-nowrap">
                        {timeAgo(n.created_at)}
                      </span>
                      <button
                        onClick={(e) => handleDeleteNotification(e, n.id)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                        title="Delete notification"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed pr-6">{n.message}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    )
  }

  const hasUnread = notifications.some((n) => !n.is_read)

  return (
    <div className="space-y-6">
      {/* Category Tabs and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div className="flex flex-wrap gap-1.5 bg-white/5 rounded-xl p-1 border border-white/8 w-full sm:w-fit">
          {['All', 'Bookings', 'Offers', 'Updates'].map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                activeCategory === c
                  ? 'bg-green-500 text-black shadow-lg shadow-green-900/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {hasUnread && (
          <button
            onClick={handleMarkAllRead}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all border border-white/8"
          >
            <Check className="w-3.5 h-3.5 text-green-400" /> Mark All Read
          </button>
        )}
      </div>

      {/* Notifications Grouped List */}
      <div className="space-y-8 w-full">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl bg-white/[0.02] space-y-3">
            <Bell className="w-8 h-8 text-gray-600 mx-auto" />
            <p className="text-sm font-bold text-white">
              No notifications in {activeCategory.toLowerCase()}
            </p>
            <p className="text-xs text-gray-500">We&apos;ll notify you when something updates.</p>
          </div>
        ) : (
          <>
            {renderSection('Today', today)}
            {renderSection('Yesterday', yesterday)}
            {renderSection('This Week', thisWeek)}
            {renderSection('Older', older)}
          </>
        )}
      </div>
    </div>
  )
}
