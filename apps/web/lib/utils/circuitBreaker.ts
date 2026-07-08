// ============================================================================
// TRUF GAMING — Circuit Breaker & Retry Policy
// Protects external APIs (Payment Gateways, SMS, Email) from cascading failures.
// ============================================================================

export class CircuitBreaker {
  private failureThreshold: number
  private recoveryTimeout: number
  private failureCount = 0
  private nextAttempt = Date.now()
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'

  constructor(failureThreshold = 3, recoveryTimeoutMs = 30000) {
    this.failureThreshold = failureThreshold
    this.recoveryTimeout = recoveryTimeoutMs
  }

  /**
   * Executes the given async action wrapped in a circuit breaker.
   */
  async fire<T>(action: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() > this.nextAttempt) {
        this.state = 'HALF_OPEN'
      } else {
        throw new Error('CircuitBreaker is OPEN. Service unavailable.')
      }
    }

    try {
      const result = await action()
      this.onSuccess()
      return result
    } catch (err) {
      this.onFailure()
      throw err
    }
  }

  private onSuccess() {
    this.failureCount = 0
    this.state = 'CLOSED'
  }

  private onFailure() {
    this.failureCount += 1
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN'
      this.nextAttempt = Date.now() + this.recoveryTimeout
      console.error(`[CircuitBreaker] State transitioning to OPEN for ${this.recoveryTimeout}ms`)
    }
  }
}

// Instantiate specific breakers for external dependencies
export const paymentBreaker = new CircuitBreaker(3, 10000) // Razorpay
export const notificationBreaker = new CircuitBreaker(5, 30000) // Email/SMS
