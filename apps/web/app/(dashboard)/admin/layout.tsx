import { AdminSidebar } from '@/components/layout/AdminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#050505] relative">
      <AdminSidebar />
      <main className="md:pl-64 w-full min-h-[calc(100vh-64px)] transition-all duration-300">
        {children}
      </main>
    </div>
  )
}
