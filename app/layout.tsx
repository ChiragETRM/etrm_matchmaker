import type { Metadata } from 'next'
import './globals.css'
import Nav from './components/Nav'
import SessionProvider from './components/SessionProvider'

export const metadata: Metadata = {
  title: 'Curated Job Engine',
  description: 'ETRM-focused job posting and application system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <SessionProvider>
          <Nav />
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}