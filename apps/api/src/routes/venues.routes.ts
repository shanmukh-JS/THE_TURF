import express, { Router } from 'express'
import {
  createVenueDraft,
  updateVenueStatus,
  getApprovedVenues,
} from '../controllers/venues.controller'
import { requireAuth, requireRole } from '../middleware/auth'

const router: express.Router = Router()

// Public route
router.get('/', getApprovedVenues)

// Owner route
router.post('/', requireAuth, requireRole(['OWNER', 'MANAGER']), createVenueDraft)

// Admin route
router.patch('/:id/status', requireAuth, requireRole(['SUPER_ADMIN']), updateVenueStatus)

import { upload } from '../utils/upload'
import { uploadVenueImage, setVenuePricing } from '../controllers/venues.controller'

// Owner routes for images and pricing
router.post(
  '/:id/images',
  requireAuth,
  requireRole(['OWNER', 'MANAGER']),
  upload.single('image'),
  uploadVenueImage
)
router.post('/:id/pricing', requireAuth, requireRole(['OWNER', 'MANAGER']), setVenuePricing)

export default router
