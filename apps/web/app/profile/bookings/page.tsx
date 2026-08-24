import { CalendarCheck, Clock, MapPin, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

const statusMap = {
  CONFIRMED: { icon: AlertCircle, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Upcoming' },
  COMPLETED: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10', label: 'Played' },
  CANCELLED: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10', label: 'Cancelled' },
}

export const metadata = {
  title: 'My Bookings | TURF GAMING',
}

export default async function CustomerBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const params = await searchParams
  const activeTab = params.tab || 'All'

  const supabase = await createClient()
  const adminClient = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch bookings, joining slots and venues
  const { data: rawBookings } = await adminClient
    .from('bookings')
    .select(
      `
      id,
      total_amount,
      advance_paid,
      status,
      slots(date, start_time, end_time),
      venues(name, address)
    `
    )
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })

  // Transform raw data into the UI shape
  const bookings = (rawBookings || []).map((b: any) => {
    const slotObj = Array.isArray(b.slots) ? b.slots[0] : b.slots
    const venueObj = Array.isArray(b.venues) ? b.venues[0] : b.venues

    // Format Date (e.g. "Jul 10, 2026")
    const dateObj = slotObj?.date ? new Date(slotObj.date + 'T00:00:00') : new Date()
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

    // Format Time (e.g. "7:00 PM - 8:00 PM")
    const formatTime = (timeStr?: string) => {
      if (!timeStr) return ''
      if (timeStr.includes(':') && !timeStr.includes('T')) {
        const [hrStr, minStr] = timeStr.split(':')
        const hr = parseInt(hrStr || '0', 10)
        const ampm = hr >= 12 ? 'PM' : 'AM'
        const displayHr = hr % 12 || 12
        return `${displayHr}:${minStr || '00'} ${ampm}`
      }
      const t = new Date(timeStr)
      return isNaN(t.getTime())
        ? timeStr
        : t.toLocaleTimeString('en-US', {
            timeZone: 'Asia/Kolkata',
            hour: 'numeric',
            minute: '2-digit',
          })
    }
    const startTimeFormatted = formatTime(slotObj?.start_time)
    const endTimeFormatted = formatTime(slotObj?.end_time)
    const formattedTime =
      startTimeFormatted && endTimeFormatted
        ? `${startTimeFormatted} – ${endTimeFormatted}`
        : 'Custom Slot'

    return {
      id: b.id.substring(0, 8).toUpperCase(), // Short ID
      venue: venueObj?.name || 'Turf Arena',
      area: venueObj?.address?.split(',')[0]?.trim() || 'Unknown Area',
      date: formattedDate,
      time: formattedTime,
      amount: Number(b.total_amount || 0),
      advance: Number(b.advance_paid || 0),
      status: b.status,
    }
  })

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'Upcoming') return b.status === 'CONFIRMED'
    if (activeTab === 'Completed') return b.status === 'COMPLETED'
    if (activeTab === 'Cancelled') return b.status === 'CANCELLED'
    return true
  })

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#060d06] px-6 md:px-12 lg:px-20 py-10 space-y-8 w-full">
      <div>
        <h1 className="text-2xl font-bold text-white">My Bookings</h1>
        <p className="text-gray-400 mt-1">All your cricket box reservations in one place.</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 bg-white/5 rounded-xl p-1 border border-white/8 w-full sm:w-fit">
        {['All', 'Upcoming', 'Completed', 'Cancelled'].map((t) => (
          <Link
            key={t}
            href={`/profile/bookings?tab=${t}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === t ? 'bg-green-500 text-black shadow-lg shadow-green-900/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            {t}
          </Link>
        ))}
      </div>

      {/* Booking Cards */}
      <div className="space-y-4">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
            <p className="text-gray-400">No {activeTab.toLowerCase()} bookings found.</p>
          </div>
        ) : (
          filteredBookings.map((b) => {
            const s = statusMap[b.status as keyof typeof statusMap]
            const Icon = s.icon
            return (
              <div
                key={b.id}
                className="rounded-2xl border border-white/8 bg-white/[0.03] hover:border-white/15 transition-all overflow-hidden"
              >
                <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Venue Info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-white">{b.venue}</h3>
                      <span
                        className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.color} ${s.bg}`}
                      >
                        <Icon className="w-3 h-3" /> {s.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {b.area}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <CalendarCheck className="w-3.5 h-3.5" />
                        {b.date}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {b.time}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 font-mono">#{b.id}</p>
                  </div>

                  {/* Price & Action */}
                  <div className="flex flex-col items-end gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-lg font-bold text-white">₹{b.amount.toLocaleString()}</p>
                      <p className="text-xs text-green-400/90 font-medium">
                        {b.advance >= b.amount ? 'Paid in full' : `₹${b.advance} paid`}
                      </p>
                    </div>
                    {b.status === 'CONFIRMED' && (
                      <button className="px-4 py-1.5 rounded-lg border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/10 transition-colors">
                        Cancel Booking
                      </button>
                    )}
                    {b.status === 'COMPLETED' && (
                      <button className="px-4 py-1.5 rounded-lg border border-green-500/30 text-green-400 text-xs font-medium hover:bg-green-500/10 transition-colors">
                        Leave a Review
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </main>
  )
}
