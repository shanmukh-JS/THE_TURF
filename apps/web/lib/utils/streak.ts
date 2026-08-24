/**
 * Booking Streak Calculation Utility for TRUF GAMING
 *
 * Rules:
 * 1. Only CONFIRMED and COMPLETED bookings count toward the streak.
 * 2. Ignore CANCELLED, FAILED, REFUNDED, or pending non-qualifying statuses.
 * 3. Group bookings by calendar week (Monday to Sunday).
 * 4. If the player has a qualifying booking in the current week, count starts from this week.
 * 5. If no booking yet this week, but booked last week, streak remains active from last week.
 * 6. If no booking in current or previous week, streak resets to 0.
 */

export function getStartOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // adjust to Monday
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function getWeekIndex(date: Date): number {
  const start = getStartOfWeek(date)
  return Math.floor(start.getTime() / (7 * 24 * 60 * 60 * 1000))
}

export function calculateBookingStreak(bookings: any[] | null | undefined): number {
  if (!bookings || !Array.isArray(bookings) || bookings.length === 0) {
    return 0
  }

  const QUALIFYING_STATUSES = new Set(['CONFIRMED', 'COMPLETED'])
  const weekSet = new Set<number>()

  for (const b of bookings) {
    if (!b || !QUALIFYING_STATUSES.has(b.status)) continue

    const slot = Array.isArray(b.slots) ? b.slots[0] : b.slots
    const dateVal = slot?.date || slot?.start_time || b.created_at || b.booking_date
    if (!dateVal) continue

    const bookingDate = new Date(dateVal)
    if (isNaN(bookingDate.getTime())) continue

    weekSet.add(getWeekIndex(bookingDate))
  }

  if (weekSet.size === 0) return 0

  const now = new Date()
  const currentWeek = getWeekIndex(now)

  let streak = 0
  let checkWeek: number

  if (weekSet.has(currentWeek)) {
    checkWeek = currentWeek
  } else if (weekSet.has(currentWeek - 1)) {
    checkWeek = currentWeek - 1
  } else {
    return 0
  }

  while (weekSet.has(checkWeek)) {
    streak++
    checkWeek--
  }

  return streak
}
