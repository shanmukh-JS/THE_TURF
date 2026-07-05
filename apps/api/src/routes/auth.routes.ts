import express, { Router } from 'express'
import { register, login } from '../controllers/auth.controller'

const router: express.Router = Router()

router.post('/register', register)
router.post('/login', login)

export default router
