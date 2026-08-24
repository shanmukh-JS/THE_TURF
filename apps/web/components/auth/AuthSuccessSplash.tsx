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
          className="fixed inset-0 left-0 top-0 w-screen h-screen z-[9999] bg-[#060d06] flex flex-col items-center justify-center px-6 text-center overflow-hidden pointer-events-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          {/* Ambient Glows */}
          <div className="absolute w-[500px] h-[500px] bg-green-500/15 rounded-full blur-[140px] pointer-events-none -z-10" />
          <div className="absolute w-[300px] h-[300px] bg-emerald-400/20 rounded-full blur-[90px] pointer-events-none -z-10" />

          {/* Cinematic Logo Zoom In and Complete Zoom Out */}
          <motion.div
            animate={{
              scale: [0.82, 1.06, 1.06, 0],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 2.2,
              times: [0, 0.35, 0.75, 1],
              ease: [0.22, 1, 0.36, 1],
            }}
            onAnimationComplete={onComplete}
            className="flex flex-col items-center justify-center w-full max-w-[560px] select-none"
          >
            <img
              src="/logo-banner.png"
              alt="TURF"
              className="w-full max-w-[460px] h-auto object-contain drop-shadow-[0_0_50px_rgba(34,197,94,0.65)]"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
