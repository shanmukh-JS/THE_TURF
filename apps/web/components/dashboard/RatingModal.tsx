'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, X, Award, CheckCircle } from 'lucide-react'

// Synthesizer chime for XP reward celebration
function playXpChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const now = ctx.currentTime
    const notes = [440, 554.37, 659.25, 880] // A4, C#5, E5, A5 (major chord arpeggio)
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + idx * 0.08)
      gain.gain.setValueAtTime(0, now + idx * 0.08)
      gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.08 + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.3)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + idx * 0.08)
      osc.stop(now + idx * 0.08 + 0.4)
    })
  } catch (err) {
    console.warn('Audio arpeggio failed:', err)
  }
}

// Confetti particle element
function ConfettiEffect() {
  const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#a855f7']
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {Array.from({ length: 40 }).map((_, i) => {
        const left = Math.random() * 100
        const delay = Math.random() * 1.2
        const duration = 1.5 + Math.random() * 2
        const size = 6 + Math.random() * 8
        const color = colors[Math.floor(Math.random() * colors.length)]
        return (
          <motion.div
            key={i}
            initial={{ y: -20, x: `${left}%`, rotate: 0, opacity: 1 }}
            animate={{
              y: '110%',
              rotate: 360 * (Math.random() > 0.5 ? 1 : -1),
              opacity: [1, 1, 0],
            }}
            transition={{
              duration,
              delay,
              ease: 'easeOut',
              repeat: Infinity,
            }}
            className="absolute rounded-sm"
            style={{
              width: size,
              height: size * (Math.random() > 0.5 ? 1.5 : 1),
              backgroundColor: color,
            }}
          />
        )
      })}
    </div>
  )
}

const emojiMap: Record<number, { emoji: string; label: string }> = {
  1: { emoji: '😡', label: 'Terrible' },
  2: { emoji: '😕', label: 'Poor' },
  3: { emoji: '🙂', label: 'Good' },
  4: { emoji: '😄', label: 'Great' },
  5: { emoji: '🤩', label: 'Amazing' },
}

interface RatingModalProps {
  bookingId: string
  venueName: string
  initialValues?: {
    rating: number
    feedback: string
    groundQuality?: number
    lighting?: number
    cleanliness?: number
    staffBehaviour?: number
    valueForMoney?: number
  }
  onClose: () => void
  onSubmitSuccess: (xpAwarded: number, newLevel: number) => void
}

export function RatingModal({
  bookingId,
  venueName,
  initialValues,
  onClose,
  onSubmitSuccess,
}: RatingModalProps) {
  const [rating, setRating] = useState(initialValues?.rating || 0)
  const [hoverRating, setHoverRating] = useState(0)

  // Optional category ratings
  const [groundQuality, setGroundQuality] = useState(initialValues?.groundQuality || 0)
  const [lighting, setLighting] = useState(initialValues?.lighting || 0)
  const [cleanliness, setCleanliness] = useState(initialValues?.cleanliness || 0)
  const [staffBehaviour, setStaffBehaviour] = useState(initialValues?.staffBehaviour || 0)
  const [valueForMoney, setValueForMoney] = useState(initialValues?.valueForMoney || 0)

  const [feedback, setFeedback] = useState(initialValues?.feedback || '')
  const [startTime, setStartTime] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Celebration phase states
  const [phase, setPhase] = useState<'form' | 'celebrate'>('form')
  const [xpAwarded, setXpAwarded] = useState(0)
  const [targetLevel, setTargetLevel] = useState(1)

  useEffect(() => {
    setStartTime(Date.now())
  }, [bookingId])

  // Accessibility: Focus trap and escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase === 'form') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [phase, onClose])

  const activeStar = hoverRating || rating
  const activeEmoji = emojiMap[activeStar]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) {
      setError('Please provide an overall star rating.')
      return
    }
    if (feedback.trim().length < 10) {
      setError('Feedback comments must be at least 10 characters long.')
      return
    }
    if (feedback.trim().length > 500) {
      setError('Feedback comments cannot exceed 500 characters.')
      return
    }

    setSubmitting(true)
    setError(null)

    const reviewTimeSeconds = Math.round((Date.now() - startTime) / 1000)
    const device = window.innerWidth < 768 ? 'mobile' : 'desktop'

    try {
      const res = await fetch('/api/rating/submit-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          rating,
          feedback: feedback.trim(),
          groundQuality: groundQuality || undefined,
          lighting: lighting || undefined,
          staffBehaviour: staffBehaviour || undefined,
          cleanliness: cleanliness || undefined,
          valueForMoney: valueForMoney || undefined,
          reviewTime: reviewTimeSeconds,
          deviceType: device,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review')
      }

      setXpAwarded(data.xpAwarded || 0)
      setTargetLevel(data.level || 1)

      if (data.xpAwarded > 0) {
        setPhase('celebrate')
        playXpChime()
      } else {
        // If it was just an edit, close immediately
        onSubmitSuccess(0, data.level)
        onClose()
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => phase === 'form' && onClose()}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[#0c120c] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden relative shadow-2xl z-10 font-sans"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {phase === 'form' ? (
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-green-400">
                  Post-Match Review
                </span>
                <h2 id="modal-title" className="text-xl font-bold text-white mt-1">
                  How was your game at {venueName}?
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-950/50 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold">
                ⚠️ {error}
              </div>
            )}

            {/* Overall Star Rating */}
            <div className="flex flex-col items-center py-4 bg-white/[0.02] border border-white/5 rounded-2xl relative">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                Overall Experience *
              </span>

              {/* Star Row */}
              <div className="flex gap-2 mt-3" onMouseLeave={() => setHoverRating(0)}>
                {[1, 2, 3, 4, 5].map((starValue) => (
                  <button
                    key={starValue}
                    type="button"
                    onClick={() => setRating(starValue)}
                    onMouseEnter={() => setHoverRating(starValue)}
                    className="p-1 transition-transform active:scale-90"
                    aria-label={`Rate ${starValue} star`}
                  >
                    <Star
                      className={`w-8 h-8 transition-all ${
                        starValue <= activeStar
                          ? 'fill-yellow-500 text-yellow-500 filter drop-shadow-[0_0_8px_rgba(234,179,8,0.3)]'
                          : 'text-gray-600 hover:text-gray-400'
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Dynamic Emoji and Text Label */}
              <AnimatePresence mode="wait">
                {activeEmoji && (
                  <motion.div
                    key={activeStar}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.15 }}
                    className="text-center mt-3 text-sm font-bold text-white flex items-center gap-1.5"
                  >
                    <span>{activeEmoji.emoji}</span>
                    <span className="text-yellow-400">{activeEmoji.label}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Optional Categories Accordion */}
            <div className="space-y-3.5">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">
                Category Ratings (Optional)
              </span>

              {[
                { name: 'Turf Quality', value: groundQuality, setter: setGroundQuality },
                { name: 'Lighting', value: lighting, setter: setLighting },
                { name: 'Cleanliness', value: cleanliness, setter: setCleanliness },
                { name: 'Staff Behaviour', value: staffBehaviour, setter: setStaffBehaviour },
                { name: 'Value for Money', value: valueForMoney, setter: setValueForMoney },
              ].map((category) => (
                <div key={category.name} className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-gray-300">{category.name}</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => category.setter(val)}
                        className="transition-transform active:scale-95"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            val <= category.value
                              ? 'fill-yellow-500 text-yellow-500'
                              : 'text-gray-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Guided Feedback Box */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400 font-bold uppercase tracking-wider">
                  Review comments *
                </span>
                <span
                  className={`font-semibold ${
                    feedback.length < 10 || feedback.length > 500
                      ? 'text-red-400'
                      : 'text-green-400'
                  }`}
                >
                  {feedback.length}/500
                </span>
              </div>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                required
                className="w-full h-28 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-green-500/50 resize-none transition-all leading-relaxed"
                placeholder="What did you like?&#10;• Turf Quality&#10;• Lighting&#10;• Cleanliness&#10;• Staff & Booking Experience&#10;• Anything to improve?"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 text-white font-bold text-xs tracking-wider uppercase transition-all"
              >
                Later
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-black font-bold text-xs tracking-wider uppercase transition-all shadow-lg hover:shadow-green-500/20 flex items-center gap-1.5 disabled:opacity-40"
              >
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        ) : (
          /* XP Reward Celebration View */
          <div className="p-8 text-center space-y-6 relative overflow-hidden">
            <ConfettiEffect />

            {/* Icon Banner */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 10, delay: 0.1 }}
              className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-400"
            >
              <CheckCircle className="w-10 h-10 animate-bounce" />
            </motion.div>

            {/* Typography */}
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">🎉 THANK YOU!</h2>
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                ))}
              </div>
              <p className="text-gray-400 text-xs max-w-xs mx-auto mt-2 leading-relaxed">
                Your feedback helps thousands of cricket players discover the best turfs in
                Bhimavaram.
              </p>
            </div>

            {/* XP Award & Progress Card */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4 max-w-sm mx-auto"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-yellow-400 font-extrabold uppercase tracking-wide">
                  <Award className="w-4 h-4" /> +{xpAwarded} XP Earned
                </span>
                <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                  Reviewer Badge Active
                </span>
              </div>

              {/* Progress Bar Animation */}
              <div className="space-y-1.5">
                <div className="w-full h-2.5 bg-white/5 border border-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1.2, ease: 'easeOut', delay: 0.5 }}
                    className="h-full bg-gradient-to-r from-yellow-500 to-green-500 rounded-full"
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                  <span>Level Up Progress</span>
                  <span className="text-white">Next Level Reached!</span>
                </div>
              </div>
            </motion.div>

            {/* Action */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="pt-2"
            >
              <button
                type="button"
                onClick={() => {
                  onSubmitSuccess(xpAwarded, targetLevel)
                  onClose()
                }}
                className="w-full max-w-sm px-6 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-black font-extrabold text-xs tracking-widest uppercase transition-all shadow-lg hover:shadow-green-500/20"
              >
                Continue
              </button>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
