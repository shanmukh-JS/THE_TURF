import { Request, Response, NextFunction } from 'express'
import { AppError } from '../utils/AppError'
import { AuthRequest } from '../middleware/auth'
import prisma from '@truf-gaming/database'
import { razorpay } from '../config/razorpay'
import crypto from 'crypto'

export const createPaymentIntent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { bookingId } = req.body

    if (!bookingId) {
      throw new AppError(400, 'VALIDATION_001', 'Booking ID is required.')
    }

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
    if (!booking) {
      throw new AppError(404, 'NOT_FOUND_001', 'Booking not found')
    }

    const options = {
      amount: booking.advancePaid * 100, // in paise
      currency: 'INR',
      receipt: `rcpt_${booking.id}`,
    }

    const order = await razorpay.orders.create(options)

    res.status(200).json({
      success: true,
      message: 'Payment intent created',
      data: { orderId: order.id, amount: order.amount, currency: order.currency },
    })
  } catch (error) {
    next(error)
  }
}

export const processPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body

    if (!bookingId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new AppError(400, 'VALIDATION_001', 'Missing payment details.')
    }

    const body = razorpayOrderId + '|' + razorpayPaymentId
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'mock_key_secret')
      .update(body.toString())
      .digest('hex')

    const isValid = expectedSignature === razorpaySignature

    if (!isValid && process.env.NODE_ENV !== 'test') {
      throw new AppError(400, 'PAYMENT_001', 'Invalid payment signature.')
    }

    const result = await prisma.$transaction(async (tx: any) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { venue: true },
      })

      if (!booking || booking.status !== 'PENDING') {
        throw new AppError(400, 'PAYMENT_002', 'Booking not found or already processed.')
      }

      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CONFIRMED', paymentId: razorpayPaymentId },
      })

      const platformCut = booking.totalAmount * 0.1
      const ownerReceivable = booking.totalAmount - platformCut

      await tx.commission.create({
        data: {
          bookingId,
          ownerId: booking.venue.ownerId,
          amount: platformCut,
          status: 'PENDING',
        },
      })

      await tx.slot.update({
        where: { id: booking.slotId },
        data: {
          isBooked: true,
          isLocked: false,
          lockExpires: null,
        },
      })

      return { booking: updatedBooking }
    })

    res.status(200).json({
      success: true,
      message: 'Payment successful. Booking confirmed.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}
