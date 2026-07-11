import { PaymentProvider } from './provider'
import { RazorpayProvider } from './razorpay'

let _providerInstance: PaymentProvider | null = null

export function getPaymentProvider(): PaymentProvider {
  if (!_providerInstance) {
    // We can swap this out for a StripeProvider or MockProvider depending on ENV
    _providerInstance = new RazorpayProvider()
  }
  return _providerInstance
}
