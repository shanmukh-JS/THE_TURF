import { Router } from 'express';
import { lockSlot, createBooking } from '../controllers/bookings.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/lock', requireAuth, lockSlot);
router.post('/', requireAuth, createBooking);

export default router;
