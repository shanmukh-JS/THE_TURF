import { Request, Response, NextFunction } from 'express'
import { AppError } from '../utils/AppError'
import { AuthRequest } from '../middleware/auth'
import prisma from '@truf-gaming/database'

export const createSlots = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const venueId = String(req.params.venueId)
    const { date, startTime, endTime, price } = req.body

    if (!venueId || !date || !startTime || !endTime || !price) {
      throw new AppError(
        400,
        'VALIDATION_001',
        'venueId, date, startTime, endTime, and price are required.'
      )
    }

    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      include: { owner: true },
    })

    if (!venue) {
      throw new AppError(404, 'NOT_FOUND', 'Venue not found.')
    }

    if (venue.owner.userId !== req.user!.id) {
      throw new AppError(403, 'AUTH_004', 'You can only create slots for your own venues.')
    }

    const slot = await prisma.slot.create({
      data: {
        venueId,
        date: new Date(date),
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        price: Number(price),
      },
    })

    res.status(201).json({
      success: true,
      message: 'Slot created successfully.',
      data: { slot },
    })
  } catch (error) {
    next(error)
  }
}

export const getSlotsByVenue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const venueId = String(req.params.venueId)
    const date = String(req.query.date)

    if (!venueId) {
      throw new AppError(400, 'VALIDATION_001', 'venueId is required.')
    }

    const where: any = { venueId }

    if (req.query.date) {
      const targetDate = new Date(date)
      const nextDay = new Date(targetDate)
      nextDay.setDate(targetDate.getDate() + 1)

      where.date = {
        gte: targetDate,
        lt: nextDay,
      }
    }

    const slots = await prisma.slot.findMany({
      where,
      orderBy: { startTime: 'asc' },
    })

    res.status(200).json({
      success: true,
      message: 'Slots fetched successfully.',
      data: { slots },
    })
  } catch (error) {
    next(error)
  }
}
