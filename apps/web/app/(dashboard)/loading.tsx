export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#060d06] p-8 space-y-8 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="h-32 rounded-3xl bg-white/[0.03] border border-white/5" />

      {/* 4 Stats Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-white/[0.03] border border-white/5 p-5 space-y-3">
            <div className="w-8 h-8 rounded-xl bg-white/5" />
            <div className="w-20 h-6 bg-white/5 rounded-md" />
          </div>
        ))}
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 h-64 rounded-3xl bg-white/[0.03] border border-white/5" />
        <div className="h-64 rounded-3xl bg-white/[0.03] border border-white/5" />
      </div>
    </div>
  )
}
