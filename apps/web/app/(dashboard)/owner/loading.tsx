import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] w-full">
      <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
      <p className="mt-4 text-sm text-gray-400 font-medium tracking-wide animate-pulse">
        Loading data...
      </p>
    </div>
  )
}
