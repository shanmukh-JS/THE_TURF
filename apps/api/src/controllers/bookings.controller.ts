import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middleware/auth';
import prisma from '@truf-gaming/database';

export const lockSlot = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { slotId } = req.body;

    if (!slotId) {
      throw new AppError(400, 'VALIDATION_001', 'slotId is required.');
    }

    const slot = await prisma.slot.findUnique({
      where: { id: slotId },
      include: {
        bookings: {
          where: { status: { in: ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'] } }
        }
      }
    });

    if (!slot) {
      throw new AppError(404, 'NOT_FOUND_001', 'Slot not found.');
    }

    if (slot.bookings.length > 0) {
      throw new AppError(409, 'BOOKING_001', 'Slot is already booked.');
    }

    const now = new Date();
    if (slot.isLocked && slot.lockExpires && new Date(slot.lockExpires) > now) {
      throw new AppError(409, 'BOOKING_002', 'Slot is currently locked by another user.');
    }

    // Lock for 10 minutes
    const lockExpires = new Date(now.getTime() + 10 * 60000);

    await prisma.slot.update({
      where: { id: slotId },
      data: {
        isLocked: true,
        lockExpires
      }
    });

    res.status(200).json({
      success: true,
      message: 'Slot locked successfully. Proceed to payment.',
      data: { slotId, expiresAt: lockExpires }
    });
  } catch (error) {
    next(error);
  }
};

export const createBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { slotId, venueId, totalAmount, advancePaid } = req.body;
    
    if (!slotId || !venueId) {
       throw new AppError(400, 'VALIDATION_001', 'slotId and venueId are required.');
    }

    // Verify slot lock
    const slot = await prisma.slot.findUnique({ where: { id: slotId } });
    
    if (!slot || !slot.isLocked || !slot.lockExpires || new Date() > new Date(slot.lockExpires)) {
      throw new AppError(400, 'BOOKING_003', 'Slot lock expired or invalid. Please lock again.');
    }

    const booking = await prisma.booking.create({
      data: {
        customerId: req.user!.id,
        venueId,
        slotId,
        status: 'PENDING',
        totalAmount: totalAmount || 1000,
        advancePaid: advancePaid || 500,
        qrCode: `TG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
      }
    });

    res.status(201).json({
      success: true,
      message: 'Booking created. Awaiting payment.',
      data: { booking }
    });
  } catch (error) {
    next(error);
  }
};
