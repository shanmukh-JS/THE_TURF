import { Building, ShieldCheck } from 'lucide-react'

interface MaskedBankDetailsProps {
  bankName: string
  accountEnding: string
  isVerified?: boolean
}

export function MaskedBankDetails({
  bankName,
  accountEnding,
  isVerified = true,
}: MaskedBankDetailsProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="bg-gray-800 p-3 rounded-lg">
          <Building className="w-6 h-6 text-emerald-500" />
        </div>
        <div>
          <h4 className="text-gray-200 font-medium">{bankName}</h4>
          <p className="text-gray-400 text-sm mt-1 font-mono">•••• •••• •••• {accountEnding}</p>
        </div>
      </div>

      {isVerified ? (
        <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
          <ShieldCheck className="w-4 h-4" />
          <span>Verified</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
          <span>Pending Verification</span>
        </div>
      )}
    </div>
  )
}
