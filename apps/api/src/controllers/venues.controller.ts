import { Request, Response, NextFunction } from 'express'
import { AppError } from '../utils/AppError'
import { AuthRequest } from '../middleware/auth'
import prisma from '@truf-gaming/database'

export const createVenueDraft = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, description, address, cityId, areaId, pitches, isIndoor, turfType } = req.body

    if (!name || !cityId || !areaId || !address) {
      throw new AppError(400, 'VALIDATION_001', 'Name, Address, City, and Area are required.')
    }

    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { userId: req.user!.id },
    })

    if (!ownerProfile) {
      throw new AppError(403, 'AUTH_004', 'Only registered owners can create venues.')
    }

    const venue = await prisma.venue.create({
      data: {
        ownerId: ownerProfile.id,
        name,
        description: description || '',
        address,
        cityId,
        areaId,
        verificationStatus: 'DRAFT',
        pitches: pitches || 1,
        isIndoor: isIndoor || false,
        turfType,
      },
    })

    res.status(201).json({
      success: true,
      message: 'Venue draft created successfully.',
      data: { venue },
    })
  } catch (error) {
    next(error)
  }
}

export const updateVenueStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!status) {
      throw new AppError(400, 'VALIDATION_001', 'Status is required.')
    }

    // Must be SUPER_ADMIN (enforced by route middleware)

    const venue = await prisma.venue.update({
      where: { id: String(id) },
      data: { verificationStatus: status },
    })

    res.status(200).json({
      success: true,
      message: `Venue status updated to ${status}.`,
      data: { venue },
    })
  } catch (error) {
    next(error)
  }
}

export const getApprovedVenues = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cityId, areaId } = req.query

    const where: any = { verificationStatus: 'APPROVED' }

    if (cityId) where.cityId = String(cityId)
    if (areaId) where.areaId = String(areaId)

    const venues = await prisma.venue.findMany({
      where,
      include: {
        city: true,
        area: true,
        images: {
          where: { isCover: true },
          take: 1,
        },
        pricing: true,
        _count: {
          select: { reviews: true },
        },
      },
    })

    // Compute mock ratings if needed or real aggregates
    const enrichedVenues = venues.map((v: any) => ({
      ...v,
      rating: 4.5, // Can be dynamically calculated via a separate query or view
    }))

    res.status(200).json({
      success: true,
      message: 'Venues fetched successfully.',
      data: { venues: enrichedVenues },
    })
  } catch (error) {
    next(error)
  }
}

export const uploadVenueImage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    if (!req.file) {
      throw new AppError(400, 'VALIDATION_001', 'Image file is required.')
    }

    const venue = await prisma.venue.findUnique({
      where: { id: String(id) },
      include: { owner: true },
    })

    if (!venue) {
      throw new AppError(404, 'NOT_FOUND', 'Venue not found.')
    }

    if (venue.owner.userId !== req.user!.id) {
      throw new AppError(403, 'AUTH_004', 'You can only upload images for your own venues.')
    }

    const { uploadToCloudinary } = await import('../utils/upload')
    const imageUrl = await uploadToCloudinary(req.file.buffer)

    const venueImage = await prisma.venueImage.create({
      data: {
        venueId: venue.id,
        url: imageUrl,
        isCover: false, // Owner can set cover later
      },
    })

    res.status(201).json({
      success: true,
      message: 'Image uploaded successfully.',
      data: { image: venueImage },
    })
  } catch (error) {
    next(error)
  }
}

export const setVenuePricing = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const { price } = req.body

    if (price === undefined) {
      throw new AppError(400, 'VALIDATION_001', 'Price is required.')
    }

    const venue = await prisma.venue.findUnique({
      where: { id: String(id) },
      include: { owner: true },
    })

    if (!venue) {
      throw new AppError(404, 'NOT_FOUND', 'Venue not found.')
    }

    if (venue.owner.userId !== req.user!.id) {
      throw new AppError(403, 'AUTH_004', 'You can only set pricing for your own venues.')
    }

    const pricing = await prisma.venuePricing.upsert({
      where: { venueId: venue.id },
      update: { price: Number(price) },
      create: { venueId: venue.id, price: Number(price) },
    })

    res.status(200).json({
      success: true,
      message: 'Venue pricing updated successfully.',
      data: { pricing },
    })
  } catch (error) {
    next(error)
  }
}
