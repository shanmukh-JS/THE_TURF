import express, { Router } from 'express'
import { createReview, getVenueReviews } from '../controllers/reviews.controller'
import { requireAuth, requireRole } from '../middleware/auth'

const router: express.Router = Router()

router.get('/venue/:venueId', getVenueReviews)
router.post('/', requireAuth, requireRole(['CUSTOMER']), createReview)

export default router
