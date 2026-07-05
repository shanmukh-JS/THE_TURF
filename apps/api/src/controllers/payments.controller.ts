import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middleware/auth';
import prisma from '@truf-gaming/database';

export const processPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { bookingId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!bookingId || !razorpayPaymentId || !razorpaySignature) {
      throw new AppError(400, 'VALIDATION_001', 'Missing payment details.');
    }

    // Mock Razorpay signature verification
    const isValid = true; 

    if (!isValid) {
      throw new AppError(400, 'PAYMENT_001', 'Invalid payment signature.');
    }

    // Process payment and booking in transaction
    const result = await prisma.$transaction(async (tx: any) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId }
      });

      if (!booking) {
        throw new AppError(404, 'NOT_FOUND_001', 'Booking not found');
      }

      if (booking.status !== 'PENDING') {
        throw new AppError(400, 'PAYMENT_002', 'Booking is not pending payment');
      }

      const payment = await tx.payment.create({
        data: {
          bookingId,
          razorpayOrderId: `ORDER_${Date.now()}`,
          razorpayPaymentId,
          amount: booking.advancePaid,
          status: 'SUCCESS'
        }
      });

      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CONFIRMED' }
      });

      // Platform takes 10% commission on the total amount
      const platformCut = booking.totalAmount * 0.10;
      const ownerReceivable = booking.totalAmount - platformCut;

      await tx.commission.create({
        data: {
          bookingId,
          platformCut,
          ownerReceivable
        }
      });

      // Also unlock the slot
      await tx.slot.update({
        where: { id: booking.slotId },
        data: {
          isLocked: false,
          lockExpires: null
        }
      });

      return { booking: updatedBooking, payment };
    });

    res.status(200).json({
      success: true,
      message: 'Payment successful. Booking confirmed.',
      data: result
    });
  } catch (error) {
    next(error);
  }
};
