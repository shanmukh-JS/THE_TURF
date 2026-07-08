import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BookingService } from '@/lib/services/bookingService'
import { bookingRepository } from '@/lib/repositories/bookingRepository'
import { slotRepository } from '@/lib/repositories/slotRepository'
import { BOOKING } from '@/config/settings'

// Mock the repositories
vi.mock('@/lib/repositories/bookingRepository', () => ({
  bookingRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    updateStatus: vi.fn(),
  },
}))

vi.mock('@/lib/repositories/slotRepository', () => ({
  slotRepository: {
    findById: vi.fn(),
    lockSlot: vi.fn(),
    updateStatus: vi.fn(),
  },
}))

vi.mock('@/lib/utils/logger', () => ({
  writeAuditLog: vi.fn(),
}))

describe('BookingService', () => {
  let bookingService: BookingService

  beforeEach(() => {
    bookingService = new BookingService()
    vi.clearAllMocks()
  })

  describe('validateSlotAvailability', () => {
    it('should throw if slot is not found', async () => {
      vi.mocked(slotRepository.findById).mockResolvedValueOnce(null)
      await expect(bookingService.validateSlotAvailability('slot-1')).rejects.toThrow(
        'Slot not found.'
      )
    })

    it('should throw if slot is already booked', async () => {
      vi.mocked(slotRepository.findById).mockResolvedValueOnce({
        is_booked: true,
        status: 'Booked',
      } as any)
      await expect(bookingService.validateSlotAvailability('slot-1')).rejects.toThrow(
        'This slot has already been booked.'
      )
    })

    it('should throw if slot is locked by someone else', async () => {
      const futureDate = new Date(Date.now() + 10000).toISOString()
      vi.mocked(slotRepository.findById).mockResolvedValueOnce({
        is_booked: false,
        status: 'Available',
        is_locked: true,
        lock_expires: futureDate,
      } as any)
      await expect(bookingService.validateSlotAvailability('slot-1')).rejects.toThrow(
        'This slot is currently being booked by another user. Please try again shortly.'
      )
    })

    it('should pass and unlock if slot lock has expired', async () => {
      const pastDate = new Date(Date.now() - 10000).toISOString()
      vi.mocked(slotRepository.findById).mockResolvedValueOnce({
        is_booked: false,
        status: 'Available',
        is_locked: true,
        lock_expires: pastDate,
      } as any)
      vi.mocked(slotRepository.updateStatus).mockResolvedValueOnce(undefined)

      await expect(bookingService.validateSlotAvailability('slot-1')).resolves.toBeUndefined()
      expect(slotRepository.updateStatus).toHaveBeenCalledWith('slot-1', 'Available', false)
    })
  })

  describe('startCheckout', () => {
    it('should throw if Razorpay environment is not configured', async () => {
      // Mock validation success
      vi.mocked(slotRepository.findById).mockResolvedValueOnce({
        is_booked: false,
        status: 'Available',
      } as any)

      // Mock lock success
      vi.mocked(slotRepository.lockSlot).mockResolvedValueOnce(true)

      await expect(
        bookingService.startCheckout({
          slotId: 'slot-1',
          venueId: 'venue-1',
          customerId: 'customer-1',
          totalAmount: 1000,
          advancePaid: 500,
        })
      ).rejects.toThrow('Payment gateway not configured properly.')
    })
  })
})
