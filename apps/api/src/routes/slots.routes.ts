import express, { Router } from 'express'
import { createSlots, getSlotsByVenue } from '../controllers/slots.controller'
import { requireAuth, requireRole } from '../middleware/auth'

const router: express.Router = Router()

// Public route
router.get('/venue/:venueId', getSlotsByVenue)

// Owner route
router.post('/venue/:venueId', requireAuth, requireRole(['OWNER', 'MANAGER']), createSlots)

export default router
