'use client'

import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/useAuthStore'

// Subscription event payload type
export interface RealtimeEvent {
  table: string
  filter?: string
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: any
  old: any
  errors: any
}

interface RealtimeContextType {
  subscribe: (
    table: string,
    filter: string | undefined,
    callback: (event: RealtimeEvent) => void
  ) => () => void
  isOnline: boolean
  activeConnections: number
}

const RealtimeContext = createContext<RealtimeContextType | null>(null)

interface RegistryEntry {
  channel: any
  listeners: ((event: RealtimeEvent) => void)[]
  refCount: number
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const user = useAuthStore((state) => state.user)

  const [isOnline, setIsOnline] = useState(true)
  const [activeConnections, setActiveConnections] = useState(0)

  // Subscription Registry: maps "table:filter" to RegistryEntry
  const registry = useRef<{ [key: string]: RegistryEntry }>({})

  // Event Batcher Buffer
  const batchBuffer = useRef<RealtimeEvent[]>([])
  const batchTimeout = useRef<NodeJS.Timeout | null>(null)

  // Deduplication cache (set of recently processed event IDs)
  const processedEventIds = useRef<Set<string>>(new Set())

  // Tab State & Visibility Throttling
  const isTabActive = useRef(true)
  const hiddenEventQueue = useRef<RealtimeEvent[]>([])
  const shouldDeltaSync = useRef(false)
  const lastSyncTime = useRef<string>(new Date().toISOString())

  // Fallback Polling interval registry: maps "table:filter" to interval ID
  const pollingRegistry = useRef<{ [key: string]: NodeJS.Timeout }>({})

  // Feature Flags - default to true unless explicitly disabled in env
  const featureFlags = {
    bookings: process.env.NEXT_PUBLIC_ENABLE_REALTIME_BOOKINGS !== 'false',
    slots: process.env.NEXT_PUBLIC_ENABLE_REALTIME_SLOTS !== 'false',
    notifications: process.env.NEXT_PUBLIC_ENABLE_REALTIME_NOTIFICATIONS !== 'false',
    reviews: process.env.NEXT_PUBLIC_ENABLE_REALTIME_REVIEWS !== 'false',
    refunds: process.env.NEXT_PUBLIC_ENABLE_REALTIME_REFUNDS !== 'false',
    financials: process.env.NEXT_PUBLIC_ENABLE_REALTIME_FINANCIALS !== 'false',
  }

  // Deduplicate and process event
  const processEvent = (event: RealtimeEvent) => {
    // Generate unique composite key for deduplication
    const eventId = `${event.table}_${event.new?.id || event.old?.id}_${event.eventType}_${event.new?.updated_at || ''}`

    if (processedEventIds.current.has(eventId)) {
      return // Ignore duplicate event
    }

    // Add to deduplication set
    processedEventIds.current.add(eventId)
    // Keep set bounded to prevent memory creep
    if (processedEventIds.current.size > 1000) {
      const firstKey = processedEventIds.current.keys().next().value
      if (firstKey) processedEventIds.current.delete(firstKey)
    }

    // Keep lastSyncTime updated using server timestamp if available
    if (event.new?.updated_at) {
      lastSyncTime.current = event.new.updated_at
    }

    // Distribute event to active registry listeners
    const key = `${event.table}:${event.filter || ''}`
    const entry = registry.current[key]
    if (entry) {
      entry.listeners.forEach((callback) => callback(event))
    }
  }

  // Flush batched events in a single cycle
  const flushBatch = () => {
    if (batchBuffer.current.length === 0) return

    const eventsToProcess = [...batchBuffer.current]
    batchBuffer.current = []

    eventsToProcess.forEach((event) => {
      if (isTabActive.current) {
        processEvent(event)
      } else {
        // Tab is hidden, buffer it up to 100 events
        if (hiddenEventQueue.current.length < 100) {
          hiddenEventQueue.current.push(event)
        } else {
          // Overflowed: drop queue and register delta sync requirement
          hiddenEventQueue.current = []
          shouldDeltaSync.current = true
        }
      }
    })
  }

  // Batch event helper
  const enqueueEvent = (event: RealtimeEvent) => {
    batchBuffer.current.push(event)

    if (batchTimeout.current) clearTimeout(batchTimeout.current)
    batchTimeout.current = setTimeout(() => {
      flushBatch()
    }, 150) // 150ms buffering window
  }

  // Run Delta Sync query on tab visibility return or socket reconnection
  const runDeltaSync = async () => {
    shouldDeltaSync.current = false
    hiddenEventQueue.current = []

    // Iterate over active subscriptions and sync changed rows
    const activeSubs = Object.keys(registry.current)
    if (activeSubs.length === 0) return

    for (const subKey of activeSubs) {
      const [table, filter] = subKey.split(':')
      if (!table) continue

      let query = supabase.from(table).select('*').gt('updated_at', lastSyncTime.current)

      if (filter) {
        const [col, eqVal] = filter.split('=eq.')
        if (col && eqVal) {
          query = query.eq(col, eqVal)
        }
      }

      const { data, error } = await query
      if (!error && data) {
        data.forEach((row: any) => {
          enqueueEvent({
            table,
            filter: filter || undefined,
            eventType: 'UPDATE',
            new: row,
            old: null,
            errors: null,
          })
        })
      }
    }
  }

  // Start polling fallback for a specific subscription
  const startPolling = (table: string, filter: string | undefined) => {
    const key = `${table}:${filter || ''}`
    if (pollingRegistry.current[key]) return

    const pollInterval = setInterval(async () => {
      let query = supabase.from(table).select('*')
      if (filter) {
        const [col, eqVal] = filter.split('=eq.')
        if (col && eqVal) {
          query = query.eq(col, eqVal)
        }
      }

      const { data, error } = await query.limit(50)
      if (!error && data) {
        data.forEach((row: any) => {
          enqueueEvent({
            table,
            filter: filter || undefined,
            eventType: 'UPDATE',
            new: row,
            old: null,
            errors: null,
          })
        })
      }
    }, 45000) // 45-second polling fallback interval

    pollingRegistry.current[key] = pollInterval
  }

  // Stop polling fallback
  const stopPolling = (key: string) => {
    if (pollingRegistry.current[key]) {
      clearInterval(pollingRegistry.current[key])
      delete pollingRegistry.current[key]
    }
  }

  // Connection listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      runDeltaSync()
    }
    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Visibility state listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        isTabActive.current = true
        if (shouldDeltaSync.current) {
          runDeltaSync()
        } else {
          // Process and clear hidden visibility queue
          const queue = [...hiddenEventQueue.current]
          hiddenEventQueue.current = []
          queue.forEach(processEvent)
        }
      } else {
        isTabActive.current = false
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Subscribe table event definition
  const subscribe = (
    table: string,
    filter: string | undefined,
    callback: (event: RealtimeEvent) => void
  ) => {
    // Check feature flag first
    const flagKey = table as keyof typeof featureFlags
    if (featureFlags[flagKey] === false) {
      return () => {} // Flag disabled: return empty cleanup
    }

    const key = `${table}:${filter || ''}`

    if (!registry.current[key]) {
      registry.current[key] = {
        channel: null,
        listeners: [],
        refCount: 0,
      }

      // Initialize Supabase realtime channel
      const channel = supabase
        .channel(key)
        .on('postgres_changes', { event: '*', schema: 'public', table, filter }, (payload: any) => {
          enqueueEvent({
            table,
            filter: filter || undefined,
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
            errors: payload.errors,
          })
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            stopPolling(key)
            setActiveConnections((prev) => prev + 1)
          } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            startPolling(table, filter)
            setActiveConnections((prev) => Math.max(0, prev - 1))
          }
        })

      registry.current[key].channel = channel
    }

    registry.current[key].listeners.push(callback)
    registry.current[key].refCount++

    // Unsubscribe helper returned
    return () => {
      const entry = registry.current[key]
      if (!entry) return

      entry.listeners = entry.listeners.filter((cb) => cb !== callback)
      entry.refCount--

      if (entry.refCount === 0) {
        if (entry.channel) {
          supabase.removeChannel(entry.channel)
          setActiveConnections((prev) => Math.max(0, prev - 1))
        }
        stopPolling(key)
        delete registry.current[key]
      }
    }
  }

  // Presence channel logic (Lobby users presence)
  useEffect(() => {
    if (!user) return

    const presenceChannel = supabase
      .channel('online-lobby')
      .on('presence', { event: 'sync' }, () => {
        // Presence state changes
      })
      .subscribe()

    return () => {
      supabase.removeChannel(presenceChannel)
    }
  }, [user])

  return (
    <RealtimeContext.Provider value={{ subscribe, isOnline, activeConnections }}>
      {children}
    </RealtimeContext.Provider>
  )
}

export function useRealtime() {
  const context = useContext(RealtimeContext)
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider')
  }
  return context
}
