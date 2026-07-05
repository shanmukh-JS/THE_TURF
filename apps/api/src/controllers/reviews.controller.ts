import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middleware/auth';
import prisma from '@truf-gaming/database';

export const createReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { venueId, rating, comment } = req.body;
    const customerId = req.user!.id;

    if (!venueId || !rating) {
      throw new AppError(400, 'VALIDATION_001', 'venueId and rating are required.');
    }
    if (rating < 1 || rating > 5) {
      throw new AppError(400, 'VALIDATION_002', 'Rating must be between 1 and 5.');
    }

    // Verify customer has a completed booking for this venue
    const hasBooking = await prisma.booking.findFirst({ 
      where: { customerId, venueId, status: 'COMPLETED' } 
    });

    if (!hasBooking) {
      throw new AppError(403, 'REVIEW_001', 'You can only review venues you have visited.');
    }

    // Check if they already reviewed
    const existingReview = await prisma.review.findFirst({
      where: { customerId, venueId }
    });

    if (existingReview) {
      throw new AppError(409, 'REVIEW_002', 'You have already reviewed this venue.');
    }

    const review = await prisma.review.create({
      data: {
        venueId,
        customerId,
        rating,
        comment: comment || null
      },
      include: {
        customer: {
          select: { customerProfile: { select: { fullName: true } } }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully.',
      data: { review },
    });
  } catch (error) {
    next(error);
  }
};

export const getVenueReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { venueId } = req.params;

    const reviews = await prisma.review.findMany({
      where: { venueId: String(venueId) },
      include: {
        customer: {
          select: { customerProfile: { select: { fullName: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const aggregate = await prisma.review.aggregate({
      where: { venueId: String(venueId) },
      _avg: { rating: true },
      _count: true
    });

    res.status(200).json({
      success: true,
      data: {
        venueId,
        avgRating: aggregate._avg?.rating ? Math.round(aggregate._avg.rating * 10) / 10 : 0,
        totalReviews: aggregate._count,
        reviews: reviews.map((r: any) => ({
          id: r.id,
          customerId: r.customerId,
          customerName: r.customer.customerProfile?.fullName || 'Anonymous',
          rating: r.rating,
          comment: r.comment,
          createdAt: r.createdAt
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};
