import { MaskedBankDetails } from '@/components/finance/owner/MaskedBankDetails'

export default async function OwnerSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Payment Settings</h1>
        <p className="text-sm text-gray-400 mt-1">
          Manage your connected bank accounts and payout preferences.
        </p>
      </div>

      <div className="max-w-xl space-y-6">
        <div>
          <h2 className="text-lg font-medium text-gray-200 mb-4">Active Bank Account</h2>
          <MaskedBankDetails bankName="HDFC Bank" accountEnding="4091" isVerified={true} />
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-md font-medium text-gray-200 mb-2">Change Account</h3>
          <p className="text-sm text-gray-400 mb-4">
            For security reasons, changing your primary payout account requires manual verification.
          </p>
          <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium text-white transition-colors border border-gray-700">
            Request Account Change
          </button>
        </div>
      </div>
    </div>
  )
}
