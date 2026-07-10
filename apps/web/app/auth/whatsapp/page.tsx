import { OTPVerification } from '@/components/auth/OTPVerification'
import {
  DashboardAnimationWrapper,
  DashboardAnimationItem,
} from '@/components/ui/DashboardAnimationWrapper'

export const metadata = {
  title: 'WhatsApp Login | Turf Gaming',
  description: 'Securely login to Turf Gaming using your WhatsApp number',
}

export default function WhatsAppLoginPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background aesthetics matching Turf theme */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-green-500/10 blur-[150px] rounded-full translate-x-1/2 -translate-y-1/4" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/10 blur-[150px] rounded-full -translate-x-1/2 translate-y-1/4" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
      </div>

      <div className="relative z-10 w-full px-4">
        <DashboardAnimationWrapper className="flex flex-col items-center justify-center">
          <DashboardAnimationItem className="mb-12 text-center">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 mb-4 tracking-tight">
              TURF GAMING
            </h1>
            <p className="text-gray-400 max-w-md mx-auto">
              The premier platform for booking cricket turfs. Sign in instantly via WhatsApp.
            </p>
          </DashboardAnimationItem>

          <DashboardAnimationItem className="w-full">
            <OTPVerification />
          </DashboardAnimationItem>
        </DashboardAnimationWrapper>
      </div>
    </div>
  )
}
