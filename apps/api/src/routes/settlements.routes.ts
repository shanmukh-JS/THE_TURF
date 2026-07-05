import express, { Router } from 'express'
import { getPendingSettlements, approveSettlement } from '../controllers/settlements.controller'
import { requireAuth, requireRole } from '../middleware/auth'

const router: express.Router = Router()

router.get('/', requireAuth, requireRole(['SUPER_ADMIN']), getPendingSettlements)
router.post('/:id/approve', requireAuth, requireRole(['SUPER_ADMIN']), approveSettlement)

export default router
