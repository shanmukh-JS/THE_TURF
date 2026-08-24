import Razorpay from 'razorpay'
import crypto from 'crypto'
import {
  PaymentProvider,
  OrderRequest,
  OrderResponse,
  PayoutRequest,
  PayoutResponse,
} from './provider'

// Standard Razorpay instance helper
function getRazorpayInstance() {
  const key_id =
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
    process.env.RAZORPAY_KEY_ID ||
    'rzp_test_TCI3ClZqEjTuvq'
  const key_secret = process.env.RAZORPAY_SECRET || '2KTcoZPGLwaRVUasD9HjRy04'
  return new Razorpay({
    key_id,
    key_secret,
  })
}

export class RazorpayProvider implements PaymentProvider {
  async createOrder(request: OrderRequest): Promise<OrderResponse> {
    const razorpay = getRazorpayInstance()
    const order = await razorpay.orders.create({
      amount: request.amount,
      currency: request.currency,
      receipt: request.receiptId,
      notes: request.notes,
    })

    return {
      id: order.id,
      amount: Number(order.amount),
      currency: order.currency,
      status: order.status,
    }
  }

  verifyWebhook(body: string, signature: string): boolean {
    const webhook_secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'MyTurfGamingSecret123!'
    const expectedSignature = crypto.createHmac('sha256', webhook_secret).update(body).digest('hex')

    return expectedSignature === signature
  }

  async fetchPayment(paymentId: string): Promise<any> {
    const razorpay = getRazorpayInstance()
    return await razorpay.payments.fetch(paymentId)
  }

  async createPayout(request: PayoutRequest): Promise<PayoutResponse> {
    const razorpay = getRazorpayInstance()
    // RazorpayX Payout API integration.
    // Note: The Razorpay Node SDK handles RazorpayX payouts natively.
    // Ensure the RazorpayX account has sufficient balance and the API keys are correct.
    const payoutPayload = {
      account_number: '2323230000000000', // TRUF's RazorpayX Account (Configured)
      fund_account_id: request.accountId, // The Owner's registered Fund Account ID
      amount: request.amount,
      currency: request.currency,
      mode: 'IMPS', // IMPS, NEFT, RTGS, UPI
      purpose: 'payout',
      queue_if_low_balance: true,
      reference_id: request.referenceId,
      notes: request.notes,
    }

    // The SDK provides this under razorpay.payouts (if RazorpayX is enabled)
    const response = await (razorpay as any).payouts.create(payoutPayload)

    return {
      id: response.id,
      status: response.status,
      amount: Number(response.amount),
      utr: response.utr,
    }
  }

  async fetchPayout(payoutId: string): Promise<any> {
    const razorpay = getRazorpayInstance()
    return await (razorpay as any).payouts.fetch(payoutId)
  }

  async refund(paymentId: string, amount?: number): Promise<any> {
    const razorpay = getRazorpayInstance()
    return await razorpay.payments.refund(paymentId, { amount })
  }

  async fetchRefund(paymentId: string, refundId: string): Promise<any> {
    const razorpay = getRazorpayInstance()
    return await razorpay.payments.fetchRefund(paymentId, refundId)
  }

  async healthCheck(): Promise<boolean> {
    try {
      const razorpay = getRazorpayInstance()
      await razorpay.orders.fetch('test_health_ping_000').catch((e: any) => {
        if (e.statusCode === 401) throw e
      })
      return true
    } catch (error) {
      return false
    }
  }
}
