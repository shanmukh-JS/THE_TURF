'use client'

import { use, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Star, Award, ShieldAlert, CheckCircle, Loader2, ArrowRight } from 'lucide-react'

const CATEGORIES = [
  {
    key: 'groundQuality',
    label: 'Ground Quality',
    desc: 'Turf grass, bounce, and pitch surface condition',
  },
  {
    key: 'lighting',
    label: 'Lighting',
    desc: 'Floodlight brightness and visibility for night games',
  },
  {
    key: 'staffBehaviour',
    label: 'Staff Behaviour',
    desc: 'Staff friendliness, support, and responsiveness',
  },
  {
    key: 'cleanliness',
    label: 'Cleanliness',
    desc: 'Pitch and surrounding seating environment status',
  },
  {
    key: 'valueForMoney',
    label: 'Value for Money',
    desc: 'Pricing fairness relative to field condition',
  },
]

export default function RatingPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params)
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [venueName, setVenueName] = useState('the Turf')
  const [tokenError, setTokenError] = useState<string | null>(null)

  // Rating states
  const [overallRating, setOverallRating] = useState(5)
  const [ratings, setRatings] = useState<Record<string, number>>({
    groundQuality: 5,
    lighting: 5,
    staffBehaviour: 5,
    cleanliness: 5,
    valueForMoney: 5,
  })
  const [comments, setComments] = useState('')
  const [success, setSuccess] = useState<string | null>(null)

  // 1. Verify token status on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setTokenError('Missing rating authentication token.')
        setLoading(false)
        return
      }

      try {
        const res = await fetch(`/api/rating/verify?token=${token}&bookingId=${bookingId}`)
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Token verification failed')
        }

        setVenueName(data.venueName)
      } catch (err: any) {
        setTokenError(err.message || 'Token verification failed')
      } finally {
        setLoading(false)
      }
    }

    verifyToken()
  }, [bookingId, token])

  const handleRatingClick = (category: string, value: number) => {
    setRatings((prev) => ({ ...prev, [category]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/rating/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          token,
          overallRating,
          groundQuality: ratings.groundQuality,
          lighting: ratings.lighting,
          staffBehaviour: ratings.staffBehaviour,
          cleanliness: ratings.cleanliness,
          valueForMoney: ratings.valueForMoney,
          comments,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Submit failed')
      }

      setSuccess(data.message || 'Rating submitted successfully!')
    } catch (err: any) {
      alert(err.message || 'Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060d06] text-white flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
        <p className="text-sm text-gray-400">Verifying secure feedback link...</p>
      </div>
    )
  }

  if (tokenError) {
    return (
      <div className="min-h-screen bg-[#060d06] text-white flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-5">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-bold">Feedback Link Expired</h2>
          <p className="text-xs text-gray-500">{tokenError}</p>
        </div>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-semibold transition-all"
        >
          Return to Home
        </button>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#060d06] text-white flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-6">
        <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500">
          <CheckCircle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold">Review Completed!</h2>
          <p className="text-xs text-gray-400">{success}</p>
        </div>

        {/* Gamified feedback reward */}
        <div className="p-4 rounded-2xl bg-green-500/5 border border-green-500/10 flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <Award className="w-8 h-8 text-green-400" />
            <div className="text-left">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold">
                XP Bonus Earned
              </span>
              <span className="text-sm font-extrabold text-white">+20 XP & +10 Coins</span>
            </div>
          </div>
          <span className="text-xs text-green-400 font-extrabold bg-green-950/40 border border-green-500/25 px-2 py-0.5 rounded">
            Level up
          </span>
        </div>

        <button
          onClick={() => router.push('/player')}
          className="w-full py-3.5 rounded-xl bg-green-500 hover:bg-green-400 text-black font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-950/20"
        >
          Go to Dashboard <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#060d06] text-white p-6 max-w-xl mx-auto space-y-8">
      {/* Title */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">How was your match?</h1>
        <p className="text-xs text-gray-400">
          Share your experience at <span className="text-green-400 font-semibold">{venueName}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Overall Star Slider */}
        <div className="glass-panel p-6 rounded-2xl border border-white/8 bg-white/[0.01] space-y-3 text-center">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
            Overall Match Rating
          </label>
          <div className="flex gap-2 justify-center">
            {[1, 2, 3, 4, 5].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setOverallRating(val)}
                className="p-1 hover:scale-110 transition-transform"
              >
                <Star
                  className={`w-9 h-9 transition-colors ${
                    val <= overallRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-500">Tap to select overall stars</p>
        </div>

        {/* Categories Ratings */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
            Detailed Feedback
          </h3>
          <div className="space-y-3">
            {CATEGORIES.map(({ key, label, desc }) => (
              <div
                key={key}
                className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex items-center justify-between gap-4"
              >
                <div className="space-y-0.5 max-w-xs">
                  <h4 className="text-xs font-bold text-white">{label}</h4>
                  <p className="text-[10px] text-gray-500 leading-normal">{desc}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleRatingClick(key, val)}
                      className="p-0.5 hover:scale-105 transition-transform"
                    >
                      <Star
                        className={`w-5 h-5 transition-colors ${
                          val <= (ratings[key] ?? 5)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Text Area Comments */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Comments / Suggestions
          </label>
          <textarea
            placeholder="Tell us what you liked or where we can improve... (e.g. grass quality was great but parking was tight)"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={4}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50 transition-all resize-none leading-relaxed"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-950/20"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Submit Feedback & Get XP
        </button>
      </form>
    </div>
  )
}
