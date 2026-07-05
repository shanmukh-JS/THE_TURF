import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import * as dotenv from 'dotenv'

import authRoutes from './routes/auth.routes'
import venuesRoutes from './routes/venues.routes'
import slotsRoutes from './routes/slots.routes'
import bookingsRoutes from './routes/bookings.routes'
import paymentsRoutes from './routes/payments.routes'
import reviewsRoutes from './routes/reviews.routes'
import settlementsRoutes from './routes/settlements.routes'
import { errorHandler } from './middleware/errorHandler'
import { globalLimiter, authLimiter, bookingLimiter } from './middleware/rateLimiter'

dotenv.config()

const app = express()

// ─── Security ───────────────────────────────────────────────────────────────
app.use(helmet())
app.use(
  cors({
    origin:
      process.env.NODE_ENV === 'production'
        ? ['https://trufgaming.com', 'https://www.trufgaming.com']
        : ['http://localhost:3000'],
    credentials: true,
  })
)

// ─── Body Parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// ─── Global Rate Limiting ────────────────────────────────────────────────────
app.use(globalLimiter)

// ─── Health Check (bypass rate limiter) ─────────────────────────────────────
app.get('/healthz', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'TRUF GAMING API is running.',
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  })
})

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authLimiter, authRoutes)
app.use('/api/v1/venues', venuesRoutes)
app.use('/api/v1/slots', slotsRoutes)
app.use('/api/v1/bookings', bookingLimiter, bookingsRoutes)
app.use('/api/v1/payments', paymentsRoutes)
app.use('/api/v1/reviews', reviewsRoutes)
app.use('/api/v1/settlements', settlementsRoutes)

import { setupSwagger } from './swagger'

// ─── 404 Handler ─────────────────────────────────────────────────────────────
setupSwagger(app)

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found.` },
  })
})

// ─── Global Error Handler (must be last) ─────────────────────────────────────
app.use(errorHandler)

export default app
