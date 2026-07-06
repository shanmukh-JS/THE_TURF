import { OwnerSidebar } from '@/components/layout/OwnerSidebar'

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#060d06] relative">
      <OwnerSidebar />
      <main className="md:pl-64 w-full min-h-[calc(100vh-64px)] transition-all duration-300">
        {children}
      </main>
    </div>
  )
}
