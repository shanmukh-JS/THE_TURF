export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden animate-pulse">
      <div className="h-48 bg-white/5" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-white/8 rounded-lg w-3/4" />
        <div className="h-4 bg-white/5 rounded-lg w-1/2" />
        <div className="flex gap-2 mt-2">
          <div className="h-6 bg-white/5 rounded-lg w-16" />
          <div className="h-6 bg-white/5 rounded-lg w-20" />
          <div className="h-6 bg-white/5 rounded-lg w-14" />
        </div>
        <div className="h-9 bg-white/5 rounded-xl mt-2" />
      </div>
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-6 py-4 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-white/8 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-white/8 rounded w-1/3" />
        <div className="h-3 bg-white/5 rounded w-1/4" />
      </div>
      <div className="h-6 w-20 bg-white/5 rounded-full" />
    </div>
  )
}

export function SkeletonStat() {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 animate-pulse space-y-3">
      <div className="flex justify-between">
        <div className="w-10 h-10 rounded-xl bg-white/8" />
        <div className="w-14 h-6 rounded-full bg-white/5" />
      </div>
      <div className="h-7 bg-white/8 rounded-lg w-2/3" />
      <div className="h-4 bg-white/5 rounded-lg w-1/2" />
    </div>
  )
}
