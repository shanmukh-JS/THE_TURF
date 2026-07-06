'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import {
  Building2,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MoreVertical,
} from 'lucide-react'

export default function AdminVenuesPage() {
  const [venues, setVenues] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')
  const [search, setSearch] = useState('')

  const supabase = createClient()

  useEffect(() => {
    async function fetchVenues() {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('venues')
        .select(
          `
          *,
          owner_profiles(full_name, business_name),
          cities(name)
        `
        )
        .order('created_at', { ascending: false })

      if (data) setVenues(data)
      setIsLoading(false)
    }
    fetchVenues()
  }, [])

  const filteredVenues = venues.filter((v) => {
    const matchesTab = activeTab === 'ALL' || v.verification_status === activeTab
    const matchesSearch =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.owner_profiles?.full_name?.toLowerCase().includes(search.toLowerCase())
    return matchesTab && matchesSearch
  })

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Venues Management</h1>
          <p className="text-gray-400 mt-1">Review and manage all venues across the platform.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search venues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500/50"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-gray-300 text-sm font-medium hover:bg-white/5 transition-all">
            <Filter className="w-4 h-4" /> Filters
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10">
        {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-green-500 text-green-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab === 'PENDING' && 'Awaiting Review'}
            {tab === 'APPROVED' && 'Active Venues'}
            {tab === 'REJECTED' && 'Rejected'}
            {tab === 'ALL' && 'All Venues'}

            <span className="ml-2 px-2 py-0.5 rounded-full bg-white/10 text-xs">
              {tab === 'ALL'
                ? venues.length
                : venues.filter((v) => v.verification_status === tab).length}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#0a0f0a] border border-white/8 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-white/5 text-xs uppercase font-semibold text-gray-500 border-b border-white/8">
              <tr>
                <th className="px-6 py-4">Venue</th>
                <th className="px-6 py-4">Owner</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Submitted</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Loading venues...
                  </td>
                </tr>
              ) : filteredVenues.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5 mb-3">
                      <Building2 className="w-5 h-5 text-gray-500" />
                    </div>
                    <p className="text-gray-300 font-medium">No venues found</p>
                    <p className="text-xs text-gray-500 mt-1">Try adjusting your filters.</p>
                  </td>
                </tr>
              ) : (
                filteredVenues.map((v) => (
                  <tr key={v.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">{v.name}</p>
                          <p className="text-xs text-gray-500">
                            {v.turf_type} • {v.pitches} {v.pitches === 1 ? 'Pitch' : 'Pitches'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-gray-300">{v.owner_profiles?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{v.owner_profiles?.business_name}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                      {v.cities?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {v.verification_status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <AlertCircle className="w-3.5 h-3.5" /> Pending
                        </span>
                      )}
                      {v.verification_status === 'APPROVED' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                        </span>
                      )}
                      {v.verification_status === 'REJECTED' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                          <XCircle className="w-3.5 h-3.5" /> Rejected
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                      {formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {v.verification_status === 'PENDING' ? (
                        <Link
                          href={`/admin/venues/${v.id}`}
                          className="inline-block px-4 py-2 rounded-lg bg-green-500 text-black text-xs font-bold hover:bg-green-400 transition-colors shadow-lg shadow-green-900/20"
                        >
                          Review Venue
                        </Link>
                      ) : (
                        <Link
                          href={`/admin/venues/${v.id}`}
                          className="inline-block px-4 py-2 rounded-lg bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition-colors"
                        >
                          View Details
                        </Link>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
