import { describe, it, expect } from 'vitest'
import { PricingService } from '@/lib/services/pricingService'
import { addHours, subHours } from 'date-fns'

describe('PricingService', () => {
  describe('calculateBookingPrice', () => {
    it('should calculate standard pricing correctly', () => {
      const result = PricingService.calculateBookingPrice({ basePrice: 1000 })
      expect(result.subtotal).toBe(1000)
      expect(result.discountAmount).toBe(0)
      expect(result.totalAmount).toBe(1000)
      expect(result.platformCommission).toBe(100) // 10% default
      expect(result.ownerPayout).toBe(900)
    })

    it('should apply peak hour surcharge (10%)', () => {
      const result = PricingService.calculateBookingPrice({ basePrice: 1000, isPeakHour: true })
      expect(result.subtotal).toBe(1100)
      expect(result.totalAmount).toBe(1100)
    })

    it('should apply holiday surcharge (20%) ignoring peak hour', () => {
      const result = PricingService.calculateBookingPrice({
        basePrice: 1000,
        isPeakHour: true,
        isHoliday: true,
      })
      expect(result.subtotal).toBe(1200)
      expect(result.totalAmount).toBe(1200)
    })

    it('should apply discounts and enforce maximums', () => {
      const result = PricingService.calculateBookingPrice({
        basePrice: 1000,
        discountPercent: 50,
        maxDiscount: 200, // Caps the 500 discount to 200
      })
      expect(result.subtotal).toBe(1000)
      expect(result.discountAmount).toBe(200)
      expect(result.totalAmount).toBe(800)
      expect(result.platformCommission).toBe(80)
      expect(result.ownerPayout).toBe(720)
    })

    it('should handle decimal rounding strictly (prevent zero-decimal bugs)', () => {
      const result = PricingService.calculateBookingPrice({
        basePrice: 999, // 999
        ownerCommissionRate: 0.1, // 10% = 99.9
      })
      expect(result.totalAmount).toBe(999)
      expect(result.platformCommission).toBe(99.9)
      expect(result.ownerPayout).toBe(899.1)
    })
  })

  describe('calculateRefund', () => {
    const slotStart = new Date()

    it('should give 100% refund if cancelled > 24 hours prior', () => {
      const cancelTime = subHours(slotStart, 25)
      expect(PricingService.calculateRefund(1000, slotStart, cancelTime)).toBe(1000)
    })

    it('should give 50% refund if cancelled 2-24 hours prior', () => {
      const cancelTime = subHours(slotStart, 10)
      expect(PricingService.calculateRefund(1000, slotStart, cancelTime)).toBe(500)
    })

    it('should give 0% refund if cancelled < 2 hours prior', () => {
      const cancelTime = subHours(slotStart, 1)
      expect(PricingService.calculateRefund(1000, slotStart, cancelTime)).toBe(0)
    })

    it('should give 0% refund if match has already started', () => {
      const cancelTime = addHours(slotStart, 1)
      expect(PricingService.calculateRefund(1000, slotStart, cancelTime)).toBe(0)
    })

    it('should round refund correctly', () => {
      const cancelTime = subHours(slotStart, 10)
      expect(PricingService.calculateRefund(999, slotStart, cancelTime)).toBe(499.5)
    })
  })
})
