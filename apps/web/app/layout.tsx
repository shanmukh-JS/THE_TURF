import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/layout/Navbar'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { PageTransition } from '@/components/providers/PageTransition'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TRUF GAMING | Premium Cricket Box Booking',
  description:
    'Book the best cricket boxes in your city instantly. Browse venues, compare prices, and reserve your slot in minutes.',
  openGraph: {
    title: 'TRUF GAMING — Book Cricket Boxes Instantly',
    description: "India's premier Cricket Box booking marketplace.",
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.className} min-h-screen bg-background antialiased overflow-x-hidden`}
      >
        <Navbar />
        <AuthProvider>
          <PageTransition>{children}</PageTransition>
        </AuthProvider>
      </body>
    </html>
  )
}
