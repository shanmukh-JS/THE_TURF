import Razorpay from 'razorpay'
import { getEnv } from '@/config/env'
import { paymentBreaker } from '@/lib/utils/circuitBreaker'

export class PaymentProvider {
  /**
   * Generates a Razorpay Order protected by a Circuit Breaker.
   * Also respects Chaos Injection if configured.
   */
  async createOrder(params: { amount: number; receipt: string; notes: Record<string, string> }) {
    const env = getEnv()
    if (!env.NEXT_PUBLIC_RAZORPAY_KEY_ID || !env.RAZORPAY_SECRET) {
      throw new Error('Payment gateway not configured properly.')
    }

    const razorpay = new Razorpay({
      key_id: env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_SECRET,
    })

    const options = {
      amount: params.amount,
      currency: 'INR',
      receipt: params.receipt,
      notes: params.notes,
    }

    // Wrap the external call in the circuit breaker
    return await paymentBreaker.fire(async () => {
      // In Chaos mode, if razorpay_500 is injected, this is handled via a global monkey patch or interceptor,
      // but for cleanliness we rely on the chaos middleware or direct injection hooks if necessary.
      return await razorpay.orders.create(options)
    })
  }
}

export const paymentProvider = new PaymentProvider()
