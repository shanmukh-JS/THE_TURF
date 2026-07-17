'use client'

import { useEffect, useRef } from 'react'
import { useRealtime, RealtimeEvent } from '@/components/providers/RealtimeProvider'

/**
 * Reusable React hook to subscribe to a table and event stream.
 * Automatically registers on mount and unregisters on unmount.
 *
 * @param table - The table name to subscribe to
 * @param filter - Supabase filter string (e.g. 'customer_id=eq.123' or undefined)
 * @param onEvent - Event callback function
 */
export function useRealtimeTable(
  table: string,
  filter: string | undefined,
  onEvent: (event: RealtimeEvent) => void
) {
  const { subscribe } = useRealtime()

  // Use a ref to keep reference to callback to avoid re-triggering sub setup on every render
  const onEventRef = useRef(onEvent)

  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  useEffect(() => {
    const callback = (event: RealtimeEvent) => {
      onEventRef.current(event)
    }

    const unsubscribe = subscribe(table, filter, callback)
    return () => {
      unsubscribe()
    }
  }, [table, filter, subscribe])
}
