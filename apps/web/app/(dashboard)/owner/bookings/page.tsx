import { CalendarCheck } from 'lucide-react'

export default function OwnerBookingsPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-white mb-2">Bookings</h1>
      <p className="text-gray-400 mb-8">Manage all your upcoming and past venue reservations.</p>

      <div className="bg-[#0a0f0a] border border-white/8 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mb-4">
          <CalendarCheck className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">No Bookings Yet</h2>
        <p className="text-gray-400 max-w-md">
          Once customers start booking your venues, all reservations will appear here.
        </p>
      </div>
    </div>
  )
}
