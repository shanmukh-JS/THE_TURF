'use client'

import { useState } from 'react'
import { Building2, FileText, CreditCard, CheckCircle, ChevronRight, Upload } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const steps = [
  { id: 1, label: 'Business Info', icon: Building2 },
  { id: 2, label: 'KYC Documents', icon: FileText },
  { id: 3, label: 'Bank Account', icon: CreditCard },
  { id: 4, label: 'Submitted', icon: CheckCircle },
]

export default function OwnerOnboardingPage() {
  const [step, setStep] = useState(1)
  const [biz, setBiz] = useState({ businessName: '', gst: '', pan: '', city: '' })
  const [bank, setBank] = useState({ accountNumber: '', ifsc: '', accountName: '', upi: '' })

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#060d06] flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-xl space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Owner Onboarding</h1>
          <p className="text-gray-400 mt-1 text-sm">Complete your profile to start listing venues on TRUF GAMING.</p>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-between">
          {steps.map((s, i) => {
            const Icon = s.icon
            const done = step > s.id
            const active = step === s.id
            return (
              <div key={s.id} className="flex items-center gap-0">
                <div className="flex flex-col items-center gap-1">
                  <div className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all',
                    done ? 'bg-green-500 border-green-500' : active ? 'bg-green-500/20 border-green-500' : 'bg-transparent border-white/20'
                  )}>
                    <Icon className={cn('w-4 h-4', done || active ? 'text-green-300' : 'text-gray-600')} />
                  </div>
                  <span className={cn('text-[11px] font-medium hidden sm:block', active ? 'text-white' : 'text-gray-600')}>{s.label}</span>
                </div>
                {i < steps.length - 1 && <div className={cn('h-px flex-1 mx-2 mt-[-18px]', done ? 'bg-green-500' : 'bg-white/10')} />}
              </div>
            )
          })}
        </div>

        {/* Step 1: Business Info */}
        {step === 1 && (
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Business Information</h2>
            {[
              { field: 'businessName', label: 'Business / Venue Name', placeholder: 'Olympia Sports Pvt Ltd' },
              { field: 'city', label: 'Primary City', placeholder: 'Hyderabad' },
              { field: 'pan', label: 'PAN Number', placeholder: 'ABCDE1234F' },
              { field: 'gst', label: 'GST Number (optional)', placeholder: '29ABCDE1234F1Z5' },
            ].map(({ field, label, placeholder }) => (
              <div key={field}>
                <label className="block text-sm text-gray-400 mb-2">{label}</label>
                <input
                  type="text"
                  placeholder={placeholder}
                  value={biz[field as keyof typeof biz]}
                  onChange={e => setBiz({ ...biz, [field]: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-green-500/50 transition-colors text-sm"
                />
              </div>
            ))}
            <button
              disabled={!biz.businessName || !biz.pan || !biz.city}
              onClick={() => setStep(2)}
              className="w-full py-3 rounded-xl bg-green-500 disabled:opacity-40 hover:bg-green-400 text-black font-bold transition-all"
            >
              Continue <ChevronRight className="inline w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: KYC Documents */}
        {step === 2 && (
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 space-y-5">
            <h2 className="text-lg font-semibold text-white">Upload KYC Documents</h2>
            {[
              { label: 'Aadhar Card / Passport', sub: 'Identity proof — PDF or Image' },
              { label: 'PAN Card', sub: 'Physical or e-PAN accepted' },
              { label: 'Venue Ownership Proof', sub: 'Lease / registry document' },
            ].map((doc) => (
              <label key={doc.label} className="flex items-center justify-between p-4 rounded-xl border border-dashed border-white/15 hover:border-green-500/40 bg-white/[0.02] cursor-pointer transition-all group">
                <div>
                  <p className="text-sm font-medium text-white">{doc.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{doc.sub}</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium group-hover:bg-green-500/20 transition-all">
                  <Upload className="w-3.5 h-3.5" /> Upload
                </div>
                <input type="file" className="hidden" accept=".pdf,.jpg,.png" />
              </label>
            ))}
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl border border-white/10 text-gray-300 hover:border-white/20 transition-colors">← Back</button>
              <button onClick={() => setStep(3)} className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-black font-bold transition-all">Continue →</button>
            </div>
          </div>
        )}

        {/* Step 3: Bank Account */}
        {step === 3 && (
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Bank Account Details</h2>
            <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 px-4 py-3 text-sm text-blue-300">
              💳 Your payouts will be transferred to this account within 3-5 business days of each booking.
            </div>
            {[
              { field: 'accountName', label: 'Account Holder Name', placeholder: 'Rajesh Kumar' },
              { field: 'accountNumber', label: 'Account Number', placeholder: '1234567890123' },
              { field: 'ifsc', label: 'IFSC Code', placeholder: 'HDFC0001234' },
              { field: 'upi', label: 'UPI ID (optional)', placeholder: 'rajesh@hdfcbank' },
            ].map(({ field, label, placeholder }) => (
              <div key={field}>
                <label className="block text-sm text-gray-400 mb-2">{label}</label>
                <input
                  type="text"
                  placeholder={placeholder}
                  value={bank[field as keyof typeof bank]}
                  onChange={e => setBank({ ...bank, [field]: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-green-500/50 transition-colors text-sm"
                />
              </div>
            ))}
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-xl border border-white/10 text-gray-300 hover:border-white/20 transition-colors">← Back</button>
              <button
                disabled={!bank.accountName || !bank.accountNumber || !bank.ifsc}
                onClick={() => setStep(4)}
                className="flex-1 py-3 rounded-xl bg-green-500 disabled:opacity-40 hover:bg-green-400 text-black font-bold transition-all"
              >
                Submit for Review →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Submitted */}
        {step === 4 && (
          <div className="rounded-2xl border border-green-500/30 bg-green-500/5 p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500/40 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Application Submitted!</h2>
            <p className="text-gray-400 text-sm max-w-sm mx-auto">
              Our team will review your documents and activate your owner account within <strong className="text-white">24-48 hours</strong>. You&apos;ll receive an SMS confirmation.
            </p>
            <div className="inline-block px-4 py-2 rounded-xl bg-black/40 border border-green-500/20 font-mono text-green-400 text-xs font-bold tracking-widest">
              APPLICATION #KYC{Date.now().toString().slice(-6)}
            </div>
            <Link href="/" className="block mt-2 text-sm text-green-400 hover:text-green-300 transition-colors">
              Return to Home →
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
