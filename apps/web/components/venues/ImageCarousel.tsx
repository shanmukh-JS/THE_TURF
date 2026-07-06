'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageCarouselProps {
  images: string[]
}

export function ImageCarousel({ images }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const next = () => setCurrentIndex((i) => (i === images.length - 1 ? 0 : i + 1))
  const prev = () => setCurrentIndex((i) => (i === 0 ? images.length - 1 : i - 1))

  // Auto-play
  useEffect(() => {
    const timer = setInterval(next, 5000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]) // Reset timer when index changes

  if (!images?.length) return null

  return (
    <div className="relative w-full h-[300px] md:h-[440px] px-6 pt-6 group max-w-7xl mx-auto">
      <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10">
        {/* Images */}
        <div
          className="flex h-full transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {images.map((img, i) => (
            <div key={i} className="w-full h-full flex-shrink-0 relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt={`Venue image ${i + 1}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </div>
          ))}
        </div>

        {/* Controls */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.preventDefault()
                prev()
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault()
                next()
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={cn(
                    'transition-all duration-300 rounded-full',
                    currentIndex === i
                      ? 'w-6 h-2 bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'
                      : 'w-2 h-2 bg-white/40 hover:bg-white/60'
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
