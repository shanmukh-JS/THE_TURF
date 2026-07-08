import { differenceInHours } from 'date-fns'

export interface PricingConfig {
  basePrice: number
  isPeakHour?: boolean
  isHoliday?: boolean
  discountPercent?: number
  maxDiscount?: number
  ownerCommissionRate?: number // Defaults to 0.10 (10%)
}

export interface PricingResult {
  subtotal: number
  discountAmount: number
  totalAmount: number
  platformCommission: number
  ownerPayout: number
}

/**
 * Calculates pricing for a booking, enforcing consistent rounding.
 * Currency logic: Stored in cents/paise internally, but this service
 * outputs standard rounded decimal values for display/payment.
 */
export class PricingService {
  /**
   * Calculates final total and splits
   */
  static calculateBookingPrice(config: PricingConfig): PricingResult {
    let subtotal = config.basePrice

    // Apply Peak/Holiday multipliers
    if (config.isHoliday) {
      subtotal *= 1.2 // 20% surcharge
    } else if (config.isPeakHour) {
      subtotal *= 1.1 // 10% surcharge
    }

    let discountAmount = 0
    if (config.discountPercent) {
      discountAmount = subtotal * (config.discountPercent / 100)
      if (config.maxDiscount && discountAmount > config.maxDiscount) {
        discountAmount = config.maxDiscount
      }
    }

    const totalAmount = this.round(subtotal - discountAmount)
    const commissionRate = config.ownerCommissionRate ?? 0.1

    const platformCommission = this.round(totalAmount * commissionRate)
    const ownerPayout = this.round(totalAmount - platformCommission)

    return {
      subtotal: this.round(subtotal),
      discountAmount: this.round(discountAmount),
      totalAmount,
      platformCommission,
      ownerPayout,
    }
  }

  /**
   * Evaluates the refund eligibility and amount based on proximity to match start.
   * Policy:
   * > 24 hours: 100% refund
   * 2–24 hours: 50% refund
   * < 2 hours or match started: 0% refund
   */
  static calculateRefund(
    totalPaid: number,
    slotStartTime: Date,
    cancelTime: Date = new Date()
  ): number {
    const hoursDifference = differenceInHours(slotStartTime, cancelTime)

    if (hoursDifference >= 24) {
      return this.round(totalPaid)
    }

    if (hoursDifference >= 2) {
      return this.round(totalPaid * 0.5)
    }

    return 0
  }

  /**
   * Enforces strict 2 decimal rounding (e.g. 99.90 instead of 99.900000001)
   */
  private static round(value: number): number {
    return Math.round(value * 100) / 100
  }
}
