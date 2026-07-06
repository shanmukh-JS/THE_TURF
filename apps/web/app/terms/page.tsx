import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#060d06] text-gray-300 py-12 px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-green-400 hover:text-green-300 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div>
          <h1 className="text-3xl font-bold text-white mb-4">Terms & Conditions</h1>
          <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="space-y-8 prose prose-invert prose-green max-w-none">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Venue Listing & Accuracy</h2>
            <p className="leading-relaxed">
              By listing your venue on TRUF GAMING, you confirm that all provided information,
              including pricing, amenities, and photographs, is accurate and truly represents the
              physical state of your venue. Any discrepancies reported by users may result in
              temporary suspension of your listing.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Bookings & Cancellations</h2>
            <p className="leading-relaxed">
              Venue owners are required to honor all confirmed bookings made through the TRUF GAMING
              platform. If you need to cancel a booking due to unforeseen circumstances (e.g.,
              extreme weather, maintenance), you must notify the customer and the platform
              immediately. Repeated unexcused cancellations may affect your venue's ranking.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Payments & Payouts</h2>
            <p className="leading-relaxed">
              TRUF GAMING collects payments on behalf of the venue owner via secure payment
              gateways. Payouts are processed on a weekly basis, subject to standard banking delays
              and the deduction of applicable platform convenience fees.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Platform Fees</h2>
            <p className="leading-relaxed">
              TRUF GAMING reserves the right to charge a platform fee or commission on successful
              bookings. The exact fee structure will be communicated to you upon final account
              verification and activation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Termination</h2>
            <p className="leading-relaxed">
              Either party may terminate this agreement at any time. Upon termination, all future
              unfulfilled bookings must either be completed or fully refunded to the customers.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
