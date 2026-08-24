'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface AuthSuccessSplashProps {
  show: boolean
  onComplete: () => void
}

export function AuthSuccessSplash({ show, onComplete }: AuthSuccessSplashProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 left-0 top-0 w-screen h-screen z-[9999] bg-[#050905] flex flex-col items-center justify-center px-6 text-center overflow-hidden pointer-events-auto select-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Ambient Glows */}
          <motion.div
            animate={{
              scale: [0.8, 1.2, 1.2, 0.5],
              opacity: [0.2, 0.6, 0.6, 0],
            }}
            transition={{
              duration: 2.2,
              times: [0, 0.35, 0.75, 1],
              ease: 'easeInOut',
            }}
            className="absolute w-[600px] h-[600px] bg-green-500/20 rounded-full blur-[150px] pointer-events-none -z-10"
          />
          <motion.div
            animate={{
              scale: [0.6, 1.1, 1.1, 0.3],
              opacity: [0.3, 0.8, 0.8, 0],
            }}
            transition={{
              duration: 2.2,
              times: [0, 0.35, 0.75, 1],
              ease: 'easeInOut',
            }}
            className="absolute w-[350px] h-[350px] bg-emerald-400/25 rounded-full blur-[100px] pointer-events-none -z-10"
          />

          {/* Cinematic Logo Zoom In and Complete Zoom Out */}
          <motion.div
            animate={{
              scale: [0.75, 1.05, 1.08, 0],
              opacity: [0, 1, 1, 0],
              filter: ['blur(6px)', 'blur(0px)', 'blur(0px)', 'blur(10px)'],
            }}
            transition={{
              duration: 2.2,
              times: [0, 0.35, 0.75, 1],
              ease: [0.16, 1, 0.3, 1],
            }}
            onAnimationComplete={onComplete}
            className="flex flex-col items-center justify-center w-full max-w-[580px] p-4"
          >
            <img
              src="/logo-banner.png"
              alt="TURF"
              className="w-full max-w-[480px] h-auto object-contain drop-shadow-[0_0_60px_rgba(34,197,94,0.7)]"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
