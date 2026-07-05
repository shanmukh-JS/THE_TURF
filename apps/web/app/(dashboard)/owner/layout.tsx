import { OwnerSidebar } from '@/components/layout/OwnerSidebar'

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#060d06]">
      <OwnerSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
