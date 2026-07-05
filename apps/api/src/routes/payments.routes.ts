import express, { Router } from 'express'
import { processPayment, createPaymentIntent } from '../controllers/payments.controller'
import { requireAuth } from '../middleware/auth'

const router: express.Router = Router()

router.post('/intent', requireAuth, createPaymentIntent)
router.post('/verify', requireAuth, processPayment)

export default router
