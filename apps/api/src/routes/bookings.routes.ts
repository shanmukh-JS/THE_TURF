import express, { Router } from 'express'
import { lockSlot, createBooking } from '../controllers/bookings.controller'
import { requireAuth } from '../middleware/auth'

const router: express.Router = Router()

router.post('/lock', requireAuth, lockSlot)
router.post('/', requireAuth, createBooking)

export default router
