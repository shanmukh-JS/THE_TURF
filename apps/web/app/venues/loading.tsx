import { SkeletonCard } from '@/components/ui/Skeleton'

export default function VenuesLoading() {
  return (
    <main className="min-h-screen bg-[#060d06]">
      <div className="bg-gradient-to-r from-green-900/30 to-black border-b border-white/8 px-8 py-8 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-24 mb-2" />
        <div className="h-8 bg-white/8 rounded-xl w-72 mb-2" />
        <div className="h-4 bg-white/5 rounded w-48" />
      </div>
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-7">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    </main>
  )
}
