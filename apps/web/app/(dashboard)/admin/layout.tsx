'use client'

import { useState } from 'react'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { Menu, Zap } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#050505]">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-white/8 bg-[#080808]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm tracking-wide">TRUF GAMING</p>
            <p className="text-[10px] text-rose-400 font-medium">Super Admin</p>
          </div>
        </div>
        <button onClick={() => setSidebarOpen(true)} className="text-white p-2">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      <div 
        className={`fixed inset-0 z-40 bg-black/80 backdrop-blur-sm transition-opacity md:hidden ${sidebarOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`} 
        onClick={() => setSidebarOpen(false)} 
      />
      
      {/* Sidebar Container */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <AdminSidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <main className="flex-1 overflow-auto md:h-screen w-full">{children}</main>
    </div>
  )
}
