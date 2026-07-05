import { CalendarCheck, Clock, MapPin, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

const bookings = [
  { id: 'BK001', venue: 'Olympia Turf', area: 'Madhapur', date: 'Jul 10, 2026', time: '7:00 PM – 8:00 PM', amount: 1200, advance: 600, status: 'CONFIRMED' },
  { id: 'BK002', venue: 'Champions Arena', area: 'Gachibowli', date: 'Jul 3, 2026', time: '9:00 AM – 10:00 AM', amount: 1500, advance: 750, status: 'COMPLETED' },
  { id: 'BK003', venue: 'Downtown Box', area: 'Banjara Hills', date: 'Jun 28, 2026', time: '6:00 PM – 7:00 PM', amount: 900, advance: 450, status: 'CANCELLED' },
]

const statusMap = {
  CONFIRMED: { icon: AlertCircle, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Upcoming' },
  COMPLETED: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10', label: 'Played' },
  CANCELLED: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10', label: 'Cancelled' },
}

export const metadata = {
  title: 'My Bookings | TRUF GAMING',
}

export default function CustomerBookingsPage() {
  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#060d06] px-4 md:px-8 py-10 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">My Bookings</h1>
        <p className="text-gray-400 mt-1">All your cricket box reservations in one place.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white/5 rounded-xl p-1 border border-white/8 w-fit">
        {['All', 'Upcoming', 'Completed', 'Cancelled'].map((t, i) => (
          <button key={t} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${i === 0 ? 'bg-green-500 text-black' : 'text-gray-400 hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Booking Cards */}
      <div className="space-y-4">
        {bookings.map((b) => {
          const s = statusMap[b.status as keyof typeof statusMap]
          const Icon = s.icon
          return (
            <div key={b.id} className="rounded-2xl border border-white/8 bg-white/[0.03] hover:border-white/15 transition-all overflow-hidden">
              <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Venue Info */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-white">{b.venue}</h3>
                    <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.color} ${s.bg}`}>
                      <Icon className="w-3 h-3" /> {s.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{b.area}</span>
                    <span className="flex items-center gap-1.5"><CalendarCheck className="w-3.5 h-3.5" />{b.date}</span>
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{b.time}</span>
                  </div>
                  <p className="text-xs text-gray-600 font-mono">#{b.id}</p>
                </div>

                {/* Price & Action */}
                <div className="flex flex-col items-end gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">₹{b.amount.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">₹{b.advance} advance paid</p>
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
        })}
      </div>
    </main>
  )
}
