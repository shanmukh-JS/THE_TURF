import { Router } from 'express';
import { getVenueSlots } from '../controllers/slots.controller';

const router = Router();

// Public route to fetch availability
router.get('/available/:venueId', getVenueSlots);

export default router;
