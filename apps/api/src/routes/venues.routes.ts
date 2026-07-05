import { Router } from 'express';
import { createVenueDraft, updateVenueStatus, getApprovedVenues } from '../controllers/venues.controller';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// Public route
router.get('/', getApprovedVenues);

// Owner route
router.post('/', requireAuth, requireRole(['OWNER', 'MANAGER']), createVenueDraft);

// Admin route
router.patch('/:id/status', requireAuth, requireRole(['SUPER_ADMIN']), updateVenueStatus);

export default router;
