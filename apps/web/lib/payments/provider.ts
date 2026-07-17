// Payment Provider Abstraction
// Defines the contract that any payment gateway must fulfill.

export interface OrderRequest {
  amount: number // In smallest currency unit (e.g., paise for INR)
  currency: string
  receiptId: string
  notes?: Record<string, string>
}

export interface OrderResponse {
  id: string
  amount: number
  currency: string
  status: string
}

export interface WebhookEvent {
  eventId: string
  eventType: string
  payload: any
  signatureValid: boolean
}

export interface PayoutRequest {
  accountId: string // The owner's bank account or virtual account ID
  amount: number
  currency: string
  referenceId: string
  notes?: Record<string, string>
}

export interface PayoutResponse {
  id: string
  status: string
  amount: number
  utr?: string // Unique Transaction Reference (often provided after clearing)
}

export interface PaymentProvider {
  /**
   * Creates a customer order for payment collection.
   */
  createOrder(request: OrderRequest): Promise<OrderResponse>

  /**
   * Validates an incoming webhook signature.
   */
  verifyWebhook(body: string, signature: string): boolean

  /**
   * Retrieves the current status of an order/payment.
   */
  fetchPayment(paymentId: string): Promise<any>

  /**
   * Executes a payout to an external bank account (e.g., RazorpayX).
   */
  createPayout(request: PayoutRequest): Promise<PayoutResponse>

  /**
   * Retrieves the current status of a payout transfer.
   */
  fetchPayout(payoutId: string): Promise<any>

  /**
   * Refunds a captured payment.
   */
  refund(paymentId: string, amount?: number): Promise<any>

  /**
   * Retrieves the current status of a refund.
   */
  fetchRefund(paymentId: string, refundId: string): Promise<any>

  /**
   * Checks the health and connectivity of the provider API.
   */
  healthCheck(): Promise<boolean>
}
