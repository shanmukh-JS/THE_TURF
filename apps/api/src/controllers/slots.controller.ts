import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import prisma from '@truf-gaming/database';

export const getVenueSlots = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { venueId } = req.params;
    const { date } = req.query; // YYYY-MM-DD

    if (!date) {
      throw new AppError(400, 'VALIDATION_001', 'Date parameter is required (YYYY-MM-DD)');
    }

    const startDate = new Date(`${date}T00:00:00.000Z`);
    const endDate = new Date(`${date}T23:59:59.999Z`);

    const slots = await prisma.slot.findMany({
      where: {
        venueId: String(venueId),
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        bookings: {
          where: {
            status: { in: ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'] }
          }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    const enrichedSlots = slots.map((slot: any) => {
      const isBooked = slot.bookings.length > 0;
      const isLocked = slot.isLocked && slot.lockExpires && new Date() < new Date(slot.lockExpires);
      
      return {
        id: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isAvailable: !isBooked && !isLocked,
        isLocked,
        price: 1000 // In a real app, calculate from VenuePricing rules
      };
    });

    res.status(200).json({
      success: true,
      message: 'Slots fetched successfully.',
      data: { slots: enrichedSlots },
    });
  } catch (error) {
    next(error);
  }
};
