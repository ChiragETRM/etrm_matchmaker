import type { Metadata, Viewport } from 'next'
import './globals.css'
import Nav from './components/Nav'
import SessionProvider from './components/SessionProvider'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'ETRM Match Maker',
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