import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import prisma from '@truf-gaming/database';

export const getPendingSettlements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Only SUPER_ADMIN (enforced by route middleware)
    
    // Get all commissions that haven't been settled
    const unsettledCommissions = await prisma.commission.findMany({
      where: { settlementId: null },
      include: {
        booking: {
          include: {
            venue: {
              include: { owner: true }
            }
          }
        }
      }
    });

    // Group by owner
    const settlementsByOwner = unsettledCommissions.reduce((acc: any, comm: any) => {
      const owner = comm.booking.venue.owner;
      const ownerId = owner.id;
      
      if (!acc[ownerId]) {
        acc[ownerId] = {
          ownerId,
          ownerName: owner.fullName,
          totalAmount: 0,
          commissions: []
        };
      }
      
      acc[ownerId].totalAmount += comm.ownerReceivable;
      acc[ownerId].commissions.push(comm.id);
      return acc;
    }, {} as Record<string, any>);

    const pendingSettlements = Object.values(settlementsByOwner);

    res.status(200).json({
      success: true,
      message: 'Pending settlements fetched.',
      data: { pendingSettlements },
    });
  } catch (error) {
    next(error);
  }
};

export const approveSettlement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ownerId, commissionIds } = req.body;

    if (!ownerId || !commissionIds || !Array.isArray(commissionIds)) {
       throw new AppError(400, 'VALIDATION_001', 'ownerId and commissionIds are required.');
    }

    const result = await prisma.$transaction(async (tx: any) => {
      // Calculate total for these commissions to ensure consistency
      const commissions = await tx.commission.findMany({
        where: { id: { in: commissionIds }, settlementId: null }
      });

      if (commissions.length !== commissionIds.length) {
        throw new AppError(400, 'SETTLEMENT_001', 'Some commissions are invalid or already settled.');
      }

      const totalAmount = commissions.reduce((sum: number, c: any) => sum + c.ownerReceivable, 0);

      // Create settlement record
      const settlement = await tx.ownerSettlement.create({
        data: {
          ownerId,
          amount: totalAmount,
          status: 'COMPLETED',
          transferId: `TXN_${Date.now()}` // Mock bank transfer ID
        }
      });

      // Update commissions
      await tx.commission.updateMany({
        where: { id: { in: commissionIds } },
        data: { settlementId: settlement.id }
      });

      return settlement;
    });

    res.status(200).json({
      success: true,
      message: 'Settlement approved and transfer initiated.',
      data: { settlement: result },
    });
  } catch (error) {
    next(error);
  }
};
