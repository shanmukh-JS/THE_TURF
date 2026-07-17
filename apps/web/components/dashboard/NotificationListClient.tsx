'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  CalendarCheck,
  CreditCard,
  Info,
  ShieldAlert,
  Check,
  Trash2,
  Search,
  Archive,
  Pin,
  Star,
} from 'lucide-react'
import * as Lucide from 'lucide-react'
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
  category: string
  priority: string
  icon?: string
  color?: string
  action_button?: boolean
  action_text?: string
  expires_at?: string
  metadata?: any
  is_pinned?: boolean
  is_archived?: boolean
  is_favorite?: boolean
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
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [visibleLimit, setVisibleLimit] = useState(10)
  const [loading, setLoading] = useState(false)

  // Map category tab selection to database categories
  const matchesCategory = (n: Notification, category: string) => {
    const cat = (n.category || 'SYSTEM').toUpperCase()
    if (category === 'All') return !n.is_archived
    if (category === 'Archived') return !!n.is_archived
    if (category === 'Bookings') return cat === 'BOOKINGS'
    if (category === 'XP/Levels')
      return cat === 'XP' || cat === 'LEVELS' || cat === 'ACHIEVEMENTS' || cat === 'STREAKS'
    if (category === 'Payments') return cat === 'PAYMENTS' || cat === 'REFUNDS' || cat === 'WALLET'
    if (category === 'Offers') return cat === 'PROMOTIONS' || cat === 'OFFERS' || cat === 'COUPONS'
    if (category === 'System') return cat === 'SYSTEM' || cat === 'SECURITY'
    return true
  }

  // Filter & Search
  const filteredNotifications = notifications.filter((n) => {
    const catMatch = matchesCategory(n, activeCategory)
    const textMatch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase())
    return catMatch && textMatch
  })

  // Mark single as read
  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, is_read: true, updated_at: new Date().toISOString() } : n
      )
    )
    await supabase
      .from('notifications')
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq('id', id)
    await supabase.from('notification_analytics').insert({ notification_id: id, action: 'OPENED' })
  }

  // Delete single
  const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    await supabase.from('notifications').delete().eq('id', id)
  }

  // Toggle Pin
  const handleTogglePin = async (e: React.MouseEvent, id: string, current: boolean) => {
    e.stopPropagation()
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, is_pinned: !current, updated_at: new Date().toISOString() } : n
      )
    )
    await supabase
      .from('notifications')
      .update({ is_pinned: !current, updated_at: new Date().toISOString() })
      .eq('id', id)
  }

  // Toggle Favorite
  const handleToggleFavorite = async (e: React.MouseEvent, id: string, current: boolean) => {
    e.stopPropagation()
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, is_favorite: !current, updated_at: new Date().toISOString() } : n
      )
    )
    await supabase
      .from('notifications')
      .update({ is_favorite: !current, updated_at: new Date().toISOString() })
      .eq('id', id)
  }

  // Toggle Archive
  const handleToggleArchive = async (e: React.MouseEvent, id: string, current: boolean) => {
    e.stopPropagation()
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, is_archived: !current, updated_at: new Date().toISOString() } : n
      )
    )
    await supabase
      .from('notifications')
      .update({ is_archived: !current, updated_at: new Date().toISOString() })
      .eq('id', id)
    await supabase
      .from('notification_analytics')
      .insert({ notification_id: id, action: !current ? 'ARCHIVED' : 'DELIVERED' })
  }

  // Mark all as read
  const handleMarkAllRead = async () => {
    setLoading(true)
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true, updated_at: new Date().toISOString() }))
    )
    await supabase
      .from('notifications')
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
    setLoading(false)
  }

  // Bulk Actions
  const handleBulkMarkRead = async () => {
    if (selectedIds.length === 0) return
    setNotifications((prev) =>
      prev.map((n) =>
        selectedIds.includes(n.id)
          ? { ...n, is_read: true, updated_at: new Date().toISOString() }
          : n
      )
    )
    await supabase
      .from('notifications')
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .in('id', selectedIds)
    setSelectedIds([])
  }

  const handleBulkArchive = async () => {
    if (selectedIds.length === 0) return
    setNotifications((prev) =>
      prev.map((n) =>
        selectedIds.includes(n.id)
          ? { ...n, is_archived: true, updated_at: new Date().toISOString() }
          : n
      )
    )
    await supabase
      .from('notifications')
      .update({ is_archived: true, updated_at: new Date().toISOString() })
      .in('id', selectedIds)
    setSelectedIds([])
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    setNotifications((prev) => prev.filter((n) => !selectedIds.includes(n.id)))
    await supabase.from('notifications').delete().in('id', selectedIds)
    setSelectedIds([])
  }

  // Toggle selection check
  const handleToggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  // Real-time updates subscription
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

  // Chronological sorting & splitting
  const groupNotifications = (list: Notification[]) => {
    const pinned = list.filter((n) => n.is_pinned)
    const unpinned = list.filter((n) => !n.is_pinned)

    const today: Notification[] = []
    const yesterday: Notification[] = []
    const thisWeek: Notification[] = []
    const older: Notification[] = []

    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const yesterdayMidnight = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const weekAgoMidnight = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    unpinned.forEach((n) => {
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

    return { pinned, today, yesterday, thisWeek, older }
  }

  const { pinned, today, yesterday, thisWeek, older } = groupNotifications(filteredNotifications)

  const renderSection = (title: string, list: Notification[]) => {
    if (list.length === 0) return null
    return (
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">{title}</h3>
        <div className="space-y-2.5">
          {list.map((n) => {
            const IconComponent = (Lucide as any)[n.icon || 'Bell'] || Lucide.Bell
            const colorClass = n.color || 'bg-blue-500/10 text-blue-400 border-blue-500/20'
            const isSelected = selectedIds.includes(n.id)

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
                } p-4 flex gap-4 hover:border-white/15 hover:bg-white/[0.03] transition-all cursor-pointer group relative`}
              >
                {/* Checkbox selector */}
                <div
                  className="flex items-center justify-center shrink-0"
                  onClick={(e) => handleToggleSelect(e, n.id)}
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-green-500 border-green-500'
                        : 'border-white/20 hover:border-white/40'
                    }`}
                  >
                    {isSelected && <Lucide.Check className="w-3 h-3 text-black stroke-[3px]" />}
                  </div>
                </div>

                {/* Icon box */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}
                >
                  <IconComponent className="w-5 h-5" />
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-start gap-4">
                    <h4
                      className={`text-sm ${n.is_read ? 'text-gray-300 font-semibold' : 'text-white font-extrabold'}`}
                    >
                      {n.title}
                    </h4>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-[10px] text-gray-500 whitespace-nowrap">
                        {timeAgo(n.created_at)}
                      </span>

                      {/* Row Action buttons */}
                      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={(e) => handleTogglePin(e, n.id, !!n.is_pinned)}
                          className={`p-1.5 rounded-lg hover:bg-white/5 transition-all ${
                            n.is_pinned ? 'text-green-400' : 'text-gray-500 hover:text-white'
                          }`}
                          title={n.is_pinned ? 'Unpin' : 'Pin'}
                        >
                          <Lucide.Pin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleToggleFavorite(e, n.id, !!n.is_favorite)}
                          className={`p-1.5 rounded-lg hover:bg-white/5 transition-all ${
                            n.is_favorite
                              ? 'text-yellow-400 animate-pulse'
                              : 'text-gray-500 hover:text-white'
                          }`}
                          title="Favorite"
                        >
                          <Lucide.Star className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleToggleArchive(e, n.id, !!n.is_archived)}
                          className={`p-1.5 rounded-lg hover:bg-white/5 transition-all ${
                            n.is_archived ? 'text-blue-400' : 'text-gray-500 hover:text-white'
                          }`}
                          title={n.is_archived ? 'Unarchive' : 'Archive'}
                        >
                          <Lucide.Archive className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteNotification(e, n.id)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-white/5 transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
  const paginatedNotifications = filteredNotifications.slice(0, visibleLimit)

  return (
    <div className="space-y-6">
      {/* Category Tabs and Actions */}
      <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4 border-b border-white/5 pb-4">
        <div className="flex flex-wrap gap-1.5 bg-white/5 rounded-xl p-1 border border-white/8 w-full xl:w-fit">
          {['All', 'Bookings', 'XP/Levels', 'Payments', 'Offers', 'System', 'Archived'].map((c) => (
            <button
              key={c}
              onClick={() => {
                setActiveCategory(c)
                setVisibleLimit(10)
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeCategory === c
                  ? 'bg-green-500 text-black shadow-lg shadow-green-900/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Search bar and bulk actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/8 rounded-xl pl-10 pr-4 py-2 text-xs font-medium placeholder-gray-500 text-white focus:outline-none focus:border-green-500/40 focus:ring-1 focus:ring-green-500/20 transition-all"
            />
          </div>

          {selectedIds.length > 0 ? (
            <div className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-xl p-1">
              <button
                onClick={handleBulkMarkRead}
                className="p-2 text-xs font-semibold text-green-400 hover:bg-white/5 rounded-lg transition"
                title="Mark Selected Read"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={handleBulkArchive}
                className="p-2 text-xs font-semibold text-blue-400 hover:bg-white/5 rounded-lg transition"
                title="Archive Selected"
              >
                <Archive className="w-4 h-4" />
              </button>
              <button
                onClick={handleBulkDelete}
                className="p-2 text-xs font-semibold text-red-400 hover:bg-white/5 rounded-lg transition"
                title="Delete Selected"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            hasUnread && (
              <button
                onClick={handleMarkAllRead}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all border border-white/8"
              >
                <Check className="w-3.5 h-3.5 text-green-400" /> Mark All Read
              </button>
            )
          )}
        </div>
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
            {renderSection('Pinned', pinned)}
            {renderSection('Today', today.slice(0, visibleLimit))}
            {renderSection(
              'Yesterday',
              yesterday.slice(0, Math.max(0, visibleLimit - today.length))
            )}
            {renderSection(
              'This Week',
              thisWeek.slice(0, Math.max(0, visibleLimit - today.length - yesterday.length))
            )}
            {renderSection(
              'Older',
              older.slice(
                0,
                Math.max(0, visibleLimit - today.length - yesterday.length - thisWeek.length)
              )
            )}

            {filteredNotifications.length > visibleLimit && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => setVisibleLimit((prev) => prev + 10)}
                  className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/8 text-xs font-extrabold uppercase tracking-widest rounded-xl transition"
                >
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
