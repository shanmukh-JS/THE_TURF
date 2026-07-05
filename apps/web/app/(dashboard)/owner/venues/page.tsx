import { MapPin, Star, Edit3, Trash2, Eye, Plus, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import Link from 'next/link'

const venues = [
  { id: 'v1', name: 'Olympia Turf', area: 'Madhapur, Hyderabad', pitches: 2, rating: 4.9, bookings: 128, revenue: 153600, status: 'APPROVED' },
  { id: 'v2', name: 'Downtown Cricket Box', area: 'Banjara Hills, Hyderabad', pitches: 1, rating: 4.7, bookings: 62, revenue: 55800, status: 'APPROVED' },
  { id: 'v3', name: 'Champions Turf', area: 'Gachibowli, Hyderabad', pitches: 3, rating: 0, bookings: 0, revenue: 0, status: 'UNDER_REVIEW' },
]

const statusMap = {
  APPROVED: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10', label: 'Live' },
  UNDER_REVIEW: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10', label: 'Under Review' },
  DRAFT: { icon: AlertCircle, color: 'text-gray-400', bg: 'bg-gray-400/10', label: 'Draft' },
}

export const metadata = { title: 'My Venues | TRUF GAMING Owner' }

export default function OwnerVenuesPage() {
  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Venues</h1>
          <p className="text-gray-400 mt-1">Manage all your cricket box listings.</p>
        </div>
        <Link
          href="/owner/venues/new"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-black font-semibold text-sm transition-all shadow-lg shadow-green-900/30"
        >
          <Plus className="w-4 h-4" /> Add New Venue
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {venues.map((v) => {
          const s = statusMap[v.status as keyof typeof statusMap] || statusMap.DRAFT
          const Icon = s.icon
          return (
            <div key={v.id} className="rounded-2xl border border-white/8 bg-white/[0.03] hover:border-white/15 transition-all overflow-hidden group">
              {/* Header */}
              <div className="h-2 bg-gradient-to-r from-green-600 to-emerald-500" />
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-green-400 transition-colors">{v.name}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />{v.area}
                    </p>
                  </div>
                  <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${s.color} ${s.bg}`}>
                    <Icon className="w-3 h-3" /> {s.label}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Pitches', value: v.pitches },
                    { label: 'Bookings', value: v.bookings },
                    { label: 'Rating', value: v.rating > 0 ? `${v.rating} ★` : '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-xl bg-white/5 border border-white/8 px-3 py-2 text-center">
                      <p className="text-sm font-bold text-white">{value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                {v.revenue > 0 && (
                  <div className="rounded-xl bg-green-500/5 border border-green-500/15 px-4 py-2.5 flex items-center justify-between">
                    <span className="text-xs text-gray-400">Total Revenue</span>
                    <span className="text-sm font-bold text-green-400">₹{v.revenue.toLocaleString()}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Link href={`/venues/${v.id}`} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-white/10 text-gray-300 text-xs font-medium hover:text-white hover:border-white/20 transition-all">
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </Link>
                  <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-blue-500/20 text-blue-400 text-xs font-medium hover:bg-blue-500/10 transition-all">
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/10 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {/* Add New Venue Card */}
        <Link href="/owner/venues/new" className="rounded-2xl border border-dashed border-white/15 hover:border-green-500/40 bg-transparent hover:bg-green-500/5 transition-all flex flex-col items-center justify-center min-h-[280px] gap-3 group cursor-pointer">
          <div className="w-12 h-12 rounded-full border-2 border-dashed border-white/20 group-hover:border-green-500/40 flex items-center justify-center transition-all">
            <Plus className="w-5 h-5 text-gray-600 group-hover:text-green-400 transition-colors" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-400 group-hover:text-white transition-colors">Add New Venue</p>
            <p className="text-xs text-gray-600 mt-1">List another cricket box</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
