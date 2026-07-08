// ============================================================================
// TRUF GAMING — useDebounce Hook
// Debounces a value by a given delay to prevent excessive API calls
// on rapid input changes (e.g. search fields).
// ============================================================================

import { useState, useEffect } from 'react'

/**
 * Returns a debounced version of the given value.
 * The debounced value only updates after the specified delay (ms)
 * has elapsed since the last change.
 *
 * @param value - The raw value to debounce
 * @param delay - Delay in milliseconds (default: 300)
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}
